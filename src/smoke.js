import {SINKHOLE_THROAT,smooth} from './mission.js';

export const SMOKE_COUNT=3200,SMOKE_SOURCE_Y=SINKHOLE_THROAT-12;
export const SMOKE_FIRST_EMISSION=.12,SMOKE_RELEASE_WINDOW=.32,SMOKE_BURST_SPEED=1400;
export const SMOKE_SURFACE_DELAY=SMOKE_FIRST_EMISSION-SMOKE_SOURCE_Y/110;
// out: x/y/z, diameter, opacity. Every puff is born below the throat;
// the conduit constrains its width until it has passed through the bowl.
export function smokeParticle(seed,age,out){
  const jet=seed>=.65,birth=SMOKE_FIRST_EMISSION+(jet?(seed-.65)*1.8:seed*SMOKE_RELEASE_WINDOW);
  const elapsed=Math.max(0,age-birth),t=jet?elapsed%.85:elapsed,mouth=Math.max(0,t+SMOKE_SOURCE_Y/110);
  const y=jet?SMOKE_SOURCE_Y+110*Math.min(t,-SMOKE_SOURCE_Y/110)+mouth*(120+seed*60)-mouth*mouth*20:SMOKE_SOURCE_Y+110*Math.min(t,-SMOKE_SOURCE_Y/110)+(SMOKE_BURST_SPEED+seed*900)/18*(1-Math.exp(-18*mouth))+mouth*4;
  const opened=smooth(-1,18,y),spread=jet?1+t*(8+seed*4)*opened:1.3+(18+seed*43)*(1-Math.exp(-12*mouth))*opened;
  out[0]=Math.sin(seed*153)*spread+Math.sin(t*1.4+seed*31)*mouth*1.8*opened;
  out[1]=y;
  out[2]=Math.cos(seed*129)*spread+Math.cos(t*1.2+seed*43)*mouth*1.8*opened;
  out[3]=jet?1.3+opened*(4+t*19):1.3+opened*((1-Math.exp(-18*mouth))*(15+seed*22)+mouth*2);
  out[4]=(age>=birth?1:0)*smooth(0,.025,t)*(1-smooth(jet?7:10,jet?12:17,jet?age:elapsed))*.24;
  return out;
}
