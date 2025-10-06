// main.js — placeholder for The Dot interactive art
const c = document.getElementById('scene');
const x = c.getContext('2d');
let r = 10, t = 0;
function draw(){
  x.fillStyle = 'rgba(255,255,255,0.1)';
  x.fillRect(0,0,c.width,c.height);
  x.beginPath();
  x.arc(c.width/2, c.height/2, r + 5*Math.sin(t/10), 0, Math.PI*2);
  x.fillStyle = '#ff6ad5';
  x.fill();
  t++;
  requestAnimationFrame(draw);
}
draw();
