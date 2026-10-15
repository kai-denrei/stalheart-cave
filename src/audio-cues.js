export const CAVE_CUES=['sinkhole_quake','blast_fire','isao_strike_countdown','isao_hit_wall','isao_hit_enemy','isao_hit_tentacle','queen_laying_eggs','alien_reverb'];
export function impactCue(kind){return kind==='tentacle'?'isao_hit_tentacle':['cutis','gorogoro','reed','egg','queen'].includes(kind)?'isao_hit_enemy':'isao_hit_wall';}

// Simulation time owns silence and cooldowns, so pausing cannot advance the soundscape.
export function createQuietWindow(){
  let activityAt=0,busyUntil=0,ambientAt=-Infinity;
  return {
    reset(){activityAt=busyUntil=0;ambientAt=-Infinity;},
    activity(time,duration=0){activityAt=time;busyUntil=Math.max(busyUntil,time+duration);},
    due(time,underground,enabled=true){
      if(!underground||!enabled||time-Math.max(activityAt,busyUntil)<18||time-ambientAt<35)return false;
      ambientAt=time;return true;
    },
    quietFor:time=>Math.max(0,time-Math.max(activityAt,busyUntil)),
  };
}
