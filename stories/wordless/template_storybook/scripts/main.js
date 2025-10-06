// main.js — base animation scaffold
const c = document.getElementById('scene');
const x = c.getContext('2d');
function draw(){
  x.fillStyle = 'white';
  x.fillRect(0,0,c.width,c.height);
  requestAnimationFrame(draw);
}
draw();
