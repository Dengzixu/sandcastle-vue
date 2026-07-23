interface FakeProgressOptions {
  timeConstant?: number
  autoStart?: boolean
  parent?: FakeProgress
  parentStart?: number
  parentEnd?: number
}

/**
 * Represents a fakeProgress
 * @constructor
 * @param {object} options - options of the contructor
 * @param {number} [options.timeConstant=1000] - the timeConstant in milliseconds (see https://en.wikipedia.org/wiki/Time_constant)
 * @param {boolean} [options.autoStart=false] - if true then the progress auto start
 */
class FakeProgress {
  public timeConstant: number
  public progress: number
  private _running: boolean
  private _intervalFrequency: number
  private autoStart: boolean
  private parent?: FakeProgress
  private parentStart?: number
  private parentEnd?: number

  private _time: number = 0
  private _intervalId: number | null = null

  constructor(opts?: FakeProgressOptions) {
    if (!opts) {
      opts = {}
    }

    this.timeConstant = opts.timeConstant || 1000
    this.progress = 0
    this._running = false
    this._intervalFrequency = 100
    this.autoStart = opts.autoStart || false
    this.parent = opts.parent
    this.parentStart = opts.parentStart
    this.parentEnd = opts.parentEnd

    if (this.autoStart) {
      this.start()
    }
  }

  /**
   * Start fakeProgress instance
   * @method
   */
  public start(): void {
    this._time = 0
    this._intervalId = setInterval(this._onInterval.bind(this), this._intervalFrequency)
  }

  private _onInterval(): void {
    this._time += this._intervalFrequency
    this.setProgress(1 - Math.exp((-1 * this._time) / this.timeConstant))
  }

  /**
   * Stop fakeProgress instance and set progress to 1
   * @method
   */
  public end(): void {
    this.stop()
    this.setProgress(1)
  }

  /**
   * Stop fakeProgress instance
   * @method
   */
  public stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
    }
    this._intervalId = null
  }

  // /**
  //  * Create a sub progress bar under the first progres
  //  * @method
  //  * @param {object} options - options of the FakeProgress contructor
  //  * @param {number} [options.end=1] - the progress in the parent that correspond of 100% of the child
  //  * @param {number} [options.start=fakeprogress.progress] - the progress in the parent that correspond of 0% of the child
  //  */
  // public createSubProgress(opts?: { start?: number; end?: number }): FakeProgress {
  //   const parentStart = opts?.start ?? this.progress
  //   const parentEnd = opts?.end ?? 1

  //   const options: FakeProgressOptions = {
  //     ...opts,
  //     parent: this,
  //     parentStart,
  //     parentEnd,
  //   }

  //   delete (options as any).start
  //   delete (options as any).end

  //   const subProgress = new FakeProgress(options)
  //   return subProgress
  // }

  /**
   * SetProgress of the fakeProgress instance and updtae the parent
   * @method
   * @param {number} progress - the progress
   */
  public setProgress(progress: number): void {
    this.progress = progress
    if (this.parent) {
      const parentRange = (this.parentEnd ?? 0) - (this.parentStart ?? 0)
      this.parent.setProgress(parentRange * this.progress + (this.parentStart ?? 0))
    }
  }
}

export { FakeProgress }
