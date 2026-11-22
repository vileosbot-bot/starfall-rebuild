/** Small, original Web Audio score and game effects. Audio starts only after unlock(). */
export class GameAudio {
  constructor() {
    this.ctx=null;
    this.master=null;
    this.volume=.35;
    this.muted=false;
    this.musicEnabled=false;
    this.active=new Set();
    this.last=new Map();
    this.nextMusic=0;
    this.musicBar=0;
    this.noiseBuffer=null;
  }
  async unlock() {
    try {
      if(!this.ctx) {
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC) return false;
        this.ctx=new AC();
        this.master=this.ctx.createGain();
        this.master.gain.value=this.muted?0:this.volume*.38;
        const limiter=this.ctx.createDynamicsCompressor();
        limiter.threshold.value=-18; limiter.knee.value=18; limiter.ratio.value=5;
        limiter.attack.value=.003; limiter.release.value=.15;
        this.master.connect(limiter); limiter.connect(this.ctx.destination);
        const length=Math.floor(this.ctx.sampleRate*.65);
        this.noiseBuffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate);
        const data=this.noiseBuffer.getChannelData(0);
        let seed=731;
        for(let i=0;i<data.length;i++) { seed=(seed*1664525+1013904223)>>>0; data[i]=(seed/4294967296)*2-1; }
      }
      if(this.ctx.state==='suspended') await this.ctx.resume();
      return this.ctx.state==='running';
    } catch { return false; }
  }
  setVolume(value) {
    this.volume=Math.max(0,Math.min(1,Number(value)||0));
    this._gain();
  }
  setMuted(value) { this.muted=!!value; this._gain(); }
  _gain() {
    if(this.master&&this.ctx) this.master.gain.setTargetAtTime(this.muted?0:this.volume*.38,this.ctx.currentTime,.04);
  }
  setMusic(value) { this.musicEnabled=!!value; if(value) this.nextMusic=0; }
  _tone(freq,duration=.15,type='sine',level=.2,delay=0,endFreq=null) {
    if(!this.ctx||this.ctx.state!=='running') return;
    const t=this.ctx.currentTime+delay;
    const oscillator=this.ctx.createOscillator(), envelope=this.ctx.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(Math.max(20,freq),t);
    if(endFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
    const attack=Math.min(.025,duration*.15);
    envelope.gain.setValueAtTime(.0001,t);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,level),t+attack);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);
    oscillator.connect(envelope); envelope.connect(this.master);
    this.active.add(oscillator);
    oscillator.onended=()=>{ this.active.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(t); oscillator.stop(t+duration+.02);
  }
  _noise(duration=.12,level=.1,cutoff=1400,delay=0) {
    if(!this.ctx||!this.noiseBuffer||this.ctx.state!=='running') return;
    const t=this.ctx.currentTime+delay, source=this.ctx.createBufferSource(), filter=this.ctx.createBiquadFilter(), gain=this.ctx.createGain();
    source.buffer=this.noiseBuffer; filter.type='lowpass'; filter.frequency.value=cutoff;
    gain.gain.setValueAtTime(Math.max(.0002,level),t); gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    this.active.add(source);
    source.onended=()=>{ this.active.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(t); source.stop(t+duration+.015);
  }
  /** Effect names: ui/start/attack/cast/hit/kill/death/tower/victory/defeat/recall/purchase. */
  play(name,team='blue') {
    if(!this.ctx||this.ctx.state!=='running'||this.muted||this.volume<=0) return;
    const now=this.ctx.currentTime;
    const limits={attack:.10,hit:.10,cast:.14,ui:.05,tower:.45,kill:.35,death:.6,purchase:.18};
    if(now-(this.last.get(name)??-999)<(limits[name]??.08)) return;
    this.last.set(name,now);
    const pitch=team==='red'?.84:1;
    const tone=(f,d,t,v,delay=0,end=null)=>this._tone(f*pitch,d,t,v,delay,end?end*pitch:null);
    switch(name) {
      case 'ui': tone(640,.085,'sine',.12,0,830); break;
      case 'start':
        [196,293.66,392,587.33].forEach((n,i)=>tone(n,.8,'triangle',.13,i*.13));
        tone(98,1.1,'sine',.22); this._noise(.28,.09,500); break;
      case 'attack': tone(230,.07,'triangle',.13,0,90); this._noise(.065,.045,2200); break;
      case 'hit': tone(108,.085,'triangle',.14,0,62); this._noise(.08,.07,1500); break;
      case 'cast':
        tone(350,.25,'sine',.14,0,980); tone(700,.28,'triangle',.055,.04,420); this._noise(.12,.035,3400); break;
      case 'kill':
        [392,493.88,587.33,783.99].forEach((n,i)=>tone(n,.32,'triangle',.15,i*.075)); tone(98,.4,'sine',.22); break;
      case 'death': tone(220,.65,'triangle',.15,0,55); tone(164.81,.65,'sine',.12,.08,41.2); this._noise(.2,.08,900); break;
      case 'tower': tone(82,.6,'sine',.3,0,35); this._noise(.5,.15,800); tone(147,.25,'triangle',.11,.08,62); break;
      case 'recall': [261.63,392,523.25].forEach((n,i)=>tone(n,.7,'sine',.08,i*.13)); break;
      case 'purchase': [784,1046.5,1318.5].forEach((n,i)=>tone(n,.16,'sine',.14,i*.075)); break;
      case 'victory':
        [261.63,329.63,392,523.25,659.25,783.99,1046.5].forEach((n,i)=>tone(n,1.1,'triangle',.14,i*.17));
        [130.81,196,261.63].forEach((n,i)=>tone(n,1.8,'sine',.15,.5+i*.13)); break;
      case 'defeat':
        [392,349.23,311.13,261.63,196].forEach((n,i)=>tone(n,.9,'triangle',.12,i*.2)); tone(65.41,1.6,'sine',.2,.2); break;
      default: tone(480,.1,'sine',.09); break;
    }
  }
  /** Called from the render loop. Uses AudioContext time; no timers are needed. */
  update() {
    if(!this.musicEnabled||!this.ctx||this.ctx.state!=='running'||this.muted||this.volume<=0) return;
    const now=this.ctx.currentTime;
    if(now<this.nextMusic) return;
    this.nextMusic=now+4;
    const chord=[[130.81,196,261.63],[116.54,174.61,233.08],[103.83,155.56,207.65],[98,146.83,196]][this.musicBar++%4];
    chord.forEach((n,i)=>{ this._tone(n,3.8,'sine',.035,i*.03); this._tone(n*2,2.3,'triangle',.008,.35+i*.25); });
    const melody=[523.25,587.33,783.99,659.25,523.25,392,466.16,392];
    this._tone(melody[(this.musicBar*2)%melody.length],1.1,'sine',.025,.75);
    this._tone(melody[(this.musicBar*2+1)%melody.length],1.5,'sine',.025,2.6);
  }
  /** Stops scheduled effects without closing the reusable audio context. */
  stop() {
    for(const source of this.active) { try { source.stop(); } catch {} }
    this.active.clear(); this.nextMusic=0; this.musicBar=0; this.last.clear();
  }
}
