/* RenderPass, ShaderPass, UnrealBloomPass and OutputPass extend Pass and use
   FullScreenQuad, which upstream ships in a separate module. The codemod
   stripped their imports, so expose those two symbols as bare globals here.
   shims.js (loaded first) provides the definitions. */
(function () {
  if (typeof THREE === 'undefined' || !THREE.Pass || !THREE.FullScreenQuad) {
    throw new Error('shims.js must be loaded before Pass.js');
  }
  window.Pass = THREE.Pass;
  window.FullScreenQuad = THREE.FullScreenQuad;
})();
