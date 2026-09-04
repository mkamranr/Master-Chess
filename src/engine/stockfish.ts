import type { Color } from '@/chess/game'
import type { EngineLine, UciOption } from './uci'
import { eloToOptions, parseBestMove, parseInfoLine } from './uci'

/* ---------------------------------------------------------------------------
 * Stockfish, wrapped.
 *
 * The engine is the *lite single-threaded* WASM build, served from
 * public/engine/. That flavour is chosen deliberately: the multi-threaded
 * builds need cross-origin isolation (COOP/COEP headers), which would
 * complicate every deployment, and the lite build is still far stronger than
 * any human. It is GPL-3.0 and ships unmodified with its licence alongside.
 *
 * It is also 7MB, so nothing here runs until something actually asks for
 * analysis. Every rules lesson works with the engine never loaded.
 * ------------------------------------------------------------------------ */

export const ENGINE_URL = '/engine/stockfish-18-lite-single.js'

/** Abstracts the worker so tests can drive a scripted engine instead. */
export interface EngineTransport {
  post(command: string): void
  subscribe(handler: (line: string) => void): void
  terminate(): void
}

/** A real Web Worker running the WASM engine. */
export function createWorkerTransport(url: string = ENGINE_URL): EngineTransport {
  // A classic worker, not a module worker: the Emscripten glue uses
  // importScripts and resolves its own .wasm from its own filename, which is
  // why the two files must keep matching basenames in public/engine/.
  const worker = new Worker(url)
  const handlers: Array<(line: string) => void> = []

  worker.onmessage = (event: MessageEvent) => {
    const data = typeof event.data === 'string' ? event.data : String(event.data?.data ?? '')
    for (const line of data.split('\n')) {
      if (line.trim()) handlers.forEach((h) => h(line.trim()))
    }
  }

  return {
    post: (command) => worker.postMessage(command),
    subscribe: (handler) => handlers.push(handler),
    terminate: () => worker.terminate(),
  }
}

export interface AnalysisRequest {
  fen: string
  /** Search depth. Small numbers are fine for teaching and stay responsive. */
  depth?: number
  /** Ask for N alternative lines, to show "you could also have played…". */
  multiPv?: number
  /** Hard cap in milliseconds, so the UI never hangs. */
  movetime?: number
}

export interface AnalysisResult {
  fen: string
  /** Side to move in the analysed position; scores are from their point of view. */
  turn: Color
  bestMove: string | null
  lines: EngineLine[]
  depth: number
}

export type EngineState = 'idle' | 'loading' | 'ready' | 'searching' | 'failed'

const DEFAULT_DEPTH = 12
const DEFAULT_MOVETIME = 1200
const HANDSHAKE_TIMEOUT_MS = 20_000

export class ChessEngine {
  private transport: EngineTransport | null = null
  private readonly makeTransport: () => EngineTransport
  private state: EngineState = 'idle'
  private readyPromise: Promise<void> | null = null
  private lineHandlers: Array<(line: string) => void> = []
  private stateHandlers: Array<(state: EngineState) => void> = []
  private appliedOptions: UciOption[] = []

  constructor(makeTransport: () => EngineTransport = () => createWorkerTransport()) {
    this.makeTransport = makeTransport
  }

  getState(): EngineState {
    return this.state
  }

  onStateChange(handler: (state: EngineState) => void): () => void {
    this.stateHandlers.push(handler)
    return () => {
      this.stateHandlers = this.stateHandlers.filter((h) => h !== handler)
    }
  }

  private setState(state: EngineState) {
    this.state = state
    this.stateHandlers.forEach((h) => h(state))
  }

  /**
   * Boots the engine and completes the UCI handshake. Safe to call repeatedly;
   * concurrent callers all wait on the same boot.
   */
  ready(): Promise<void> {
    if (this.readyPromise) return this.readyPromise

    this.setState('loading')
    this.readyPromise = new Promise<void>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        this.setState('failed')
        reject(new Error('The chess engine did not start in time.'))
      }, HANDSHAKE_TIMEOUT_MS)

      try {
        this.transport = this.makeTransport()
      } catch (error) {
        clearTimeout(timer)
        settled = true
        this.setState('failed')
        reject(error instanceof Error ? error : new Error(String(error)))
        return
      }

      this.transport.subscribe((line) => {
        this.lineHandlers.forEach((h) => h(line))
      })

      const onLine = (line: string) => {
        if (line === 'uciok') this.send('isready')
        if (line === 'readyok' && !settled) {
          settled = true
          clearTimeout(timer)
          this.removeLineHandler(onLine)
          this.setState('ready')
          resolve()
        }
      }
      this.lineHandlers.push(onLine)
      this.send('uci')
    })

    return this.readyPromise
  }

  private send(command: string) {
    this.transport?.post(command)
  }

  private removeLineHandler(handler: (line: string) => void) {
    this.lineHandlers = this.lineHandlers.filter((h) => h !== handler)
  }

  /**
   * Sets playing strength. `null` means full strength. Below Stockfish's
   * UCI_Elo floor this switches to Skill Level instead — see uci.ts.
   */
  async setStrength(targetElo: number | null): Promise<void> {
    await this.ready()
    this.appliedOptions = eloToOptions(targetElo)
    for (const option of this.appliedOptions) {
      this.send(`setoption name ${option.name} value ${option.value}`)
    }
    this.send('isready')
  }

  /** The options currently in force, exposed so the UI can show the truth. */
  getAppliedOptions(): UciOption[] {
    return [...this.appliedOptions]
  }

  async analyse(request: AnalysisRequest): Promise<AnalysisResult> {
    await this.ready()

    const { fen, depth = DEFAULT_DEPTH, multiPv = 1, movetime = DEFAULT_MOVETIME } = request
    const turn: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w'

    this.setState('searching')
    const lines = new Map<number, EngineLine>()

    return new Promise<AnalysisResult>((resolve) => {
      const onLine = (line: string) => {
        const info = parseInfoLine(line)
        if (info) {
          // Later, deeper reports replace shallower ones for the same slot.
          const existing = lines.get(info.multipv)
          if (!existing || info.depth >= existing.depth) lines.set(info.multipv, info)
          return
        }

        const best = parseBestMove(line)
        if (line.startsWith('bestmove')) {
          this.removeLineHandler(onLine)
          this.setState('ready')
          const ordered = [...lines.values()].sort((a, b) => a.multipv - b.multipv)
          resolve({
            fen,
            turn,
            bestMove: best,
            lines: ordered,
            depth: ordered[0]?.depth ?? 0,
          })
        }
      }

      this.lineHandlers.push(onLine)
      this.send(`setoption name MultiPV value ${multiPv}`)
      this.send('ucinewgame')
      this.send(`position fen ${fen}`)
      this.send(`go depth ${depth} movetime ${movetime}`)
    })
  }

  /** Just the engine's chosen move, for the opponent in Play mode. */
  async bestMove(fen: string, options: { depth?: number; movetime?: number } = {}): Promise<string | null> {
    const result = await this.analyse({ fen, multiPv: 1, ...options })
    return result.bestMove
  }

  /** Stops any search in progress without tearing the engine down. */
  stop(): void {
    if (this.state === 'searching') this.send('stop')
  }

  dispose(): void {
    this.send('quit')
    this.transport?.terminate()
    this.transport = null
    this.readyPromise = null
    this.lineHandlers = []
    this.setState('idle')
  }
}

/**
 * The single shared engine for the app. Created lazily on first use so that a
 * learner working through the rules chapters never downloads it.
 */
let shared: ChessEngine | null = null

export function getEngine(): ChessEngine {
  shared ??= new ChessEngine()
  return shared
}

export function disposeEngine(): void {
  shared?.dispose()
  shared = null
}
