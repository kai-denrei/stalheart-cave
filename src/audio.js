export function createAudio(){
  let context,master,rotorGain,rotor,ambientGain,enabled=true,paused=false;
  const samples=new Map();
  async function init(){
    if(context){await context.resume();return;}
    context=new AudioContext();master=context.createGain();master.gain.value=enabled?.6:0;master.connect(context.destination);
    // Four slightly detuned motors and filtered air: no external sound service.
    rotorGain=context.createGain();rotorGain.gain.value=.022;rotorGain.connect(master);
    for(const freq of [72,74,108,110]){const osc=context.createOscillator();osc.type='sawtooth';osc.frequency.value=freq;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=340;osc.connect(filter);filter.connect(rotorGain);osc.start();if(!rotor)rotor=osc;}
    const noise=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const source=context.createBufferSource();source.buffer=noise;source.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;const gain=context.createGain();ambientGain=gain;gain.gain.value=.07;source.connect(filter);filter.connect(gain);gain.connect(master);source.start();
    for(const name of ['sinkhole_quake','blast_fire']){
      try {const response=await fetch(`./assets/audio/${name}.mp3`);samples.set(name,await context.decodeAudioData(await response.arrayBuffer()));}catch{/* Synthetic sound remains available if a sample is missing. */}
    }
  }
  function tone(freq,duration=.25,volume=.12,type='sine'){
    if(!context||paused)return;const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,context.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.55,context.currentTime+duration);gain.gain.setValueAtTime(volume,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);osc.connect(gain);gain.connect(master);osc.start();osc.stop(context.currentTime+duration);
  }
  function play(name,volume=.35){if(!context||!samples.has(name)||paused)return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=samples.get(name);gain.gain.value=volume;source.connect(gain);gain.connect(master);source.start();}
  function mute(value){enabled=!value;if(context)master.gain.setTargetAtTime(enabled&&!paused?.6:0,context.currentTime,.1);return enabled;}
  function pause(value){paused=value;if(context){master.gain.setTargetAtTime(enabled&&!paused?.6:0,context.currentTime,.08);if(!value)ambientGain.gain.setTargetAtTime(.07,context.currentTime,.1);}}
  function finish(){if(context){rotorGain.gain.setTargetAtTime(0,context.currentTime,.1);ambientGain.gain.setTargetAtTime(0,context.currentTime,.1);}}
  function update(speed){if(context){rotorGain.gain.setTargetAtTime(.018+speed*.003,context.currentTime,.1);rotor.frequency.setTargetAtTime(72+speed*4,context.currentTime,.1);}}
  return {init,tone,play,mute,pause,finish,update,get enabled(){return enabled;}};
}
