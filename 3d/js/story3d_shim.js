// 2D hikâye oynatıcısının (story2d.js, klasik betik) 3D sayfasında beklediği küreseller.
// story2d.js'ten ÖNCE yüklenir; HIRHIZ'ın kafası ve sesler 3D modülleri (story3d.js) hazır olunca bağlanır.
var headCanvas = null;                        // HIRHIZ'ın kırpılmış fotoğraf kafası (models.js getHeadTex)
function $(id) { return document.getElementById(id); }
var __voice = { play: null, stop: null };
function playVoice(kind) { return __voice.play ? __voice.play(kind) : 0; }
function stopVoice() { if (__voice.stop) __voice.stop(); }
