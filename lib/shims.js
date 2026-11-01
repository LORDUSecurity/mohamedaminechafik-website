/* Classic-script shims for the three.js ESM addons vendored in this folder.
   Pass / FullScreenQuad / OutputShader / MaskPass live in addon files the codemod
   stripped imports from; these definitions reproduce them on the THREE global. */
(function () {
  const T = THREE;

  const _quadCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  class FullScreenQuad {
    constructor(material) {
      this._mesh = new T.Mesh(new T.PlaneGeometry(2, 2), material);
      this._mesh.frustumCulled = false;
    }
    dispose() { this._mesh.geometry.dispose(); }
    render(renderer) { renderer.render(this._mesh, _quadCamera); }
    get material() { return this._mesh.material; }
    set material(value) { this._mesh.material = value; }
  }

  class Pass {
    constructor() {
      this.isPass = true;
      this.enabled = true;
      this.needsSwap = true;
      this.clear = false;
      this.renderToScreen = false;
    }
    setSize() {}
    setRenderTarget() {}
    render() { throw new Error('Pass: implement render()'); }
    dispose() {}
  }

  /* Reimplementation of three's OutputShader. OutputPass is switched to a
     ShaderMaterial (see OutputPass.js) so three injects precision, `uv`,
     `position` and the standard matrices. */
  const OutputShader = {
    name: 'OutputShader',
    uniforms: {
      'tDiffuse': { value: null },
      'toneMappingExposure': { value: 1 }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float toneMappingExposure;
      varying vec2 vUv;

      vec3 LinearToneMapping( vec3 color ) {
        return toneMappingExposure * color;
      }
      vec3 ReinhardToneMapping( vec3 color ) {
        color *= toneMappingExposure;
        return clamp( color / ( vec3( 1.0 ) + color ), 0.0, 1.0 );
      }
      vec3 OptimizedCineonToneMapping( vec3 color ) {
        color *= toneMappingExposure / 0.63;
        color = max( vec3( 0.0 ), color - 0.004 );
        return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
      }
      vec3 RRTAndODTFit( vec3 v ) {
        vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
        vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
        return a / b;
      }
      vec3 ACESFilmicToneMapping( vec3 color ) {
        const mat3 ACESInputMat = mat3(
          vec3( 0.59719, 0.07600, 0.02840 ),
          vec3( 0.35458, 0.91471, 0.13385 ),
          vec3( 0.04823, 0.01056, 0.83715 )
        );
        const mat3 ACESOutputMat = mat3(
          vec3(  1.60475, -0.10208, -0.00327 ),
          vec3( -0.53108,  1.10813, -0.07276 ),
          vec3( -0.07367, -0.00605,  1.07602 )
        );
        color *= toneMappingExposure / 0.6;
        color = ACESInputMat * color;
        color = RRTAndODTFit( color );
        return clamp( ACESOutputMat * color, 0.0, 1.0 );
      }
      vec3 LinearTosRGB( vec3 color ) {
        vec3 x = max( color, vec3( 0.0 ) );
        return mix( x * 12.92, pow( x, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), step( vec3( 0.0031308 ), x ) );
      }

      void main() {
        vec4 tex = texture2D( tDiffuse, vUv );
        vec3 color = tex.rgb;

        #ifdef LINEAR_TONE_MAPPING
          color = LinearToneMapping( color );
        #elif defined REINHARD_TONE_MAPPING
          color = ReinhardToneMapping( color );
        #elif defined CINEON_TONE_MAPPING
          color = OptimizedCineonToneMapping( color );
        #elif defined ACES_FILMIC_TONE_MAPPING
          color = ACESFilmicToneMapping( color );
        #endif

        #ifdef SRGB_TRANSFER
          color = LinearTosRGB( color );
        #endif

        gl_FragColor = vec4( color, tex.a );
      }`
  };

  function MaskPass() {}
  function ClearMaskPass() {}

  T.Pass = Pass;
  T.FullScreenQuad = FullScreenQuad;
  T.OutputShader = OutputShader;
  T.MaskPass = MaskPass;
  T.ClearMaskPass = ClearMaskPass;
})();
