function hablarPalabra() {
  const palabra = palabras[Math.floor(Math.random() * palabras.length)];
  document.getElementById("word").innerText = palabra;

  const utterance = new SpeechSynthesisUtterance(palabra);
  utterance.lang = "es-ES";
  utterance.volume = 1;

  const voices = speechSynthesis.getVoices().filter(v => v.lang.includes("es"));
  const useFemale = Math.random() < 0.5;

  let selectedVoice = voices.find(v => useFemale ?
    v.name.toLowerCase().includes("maría") || v.name.toLowerCase().includes("female") :
    v.name.toLowerCase().includes("jorge") || v.name.toLowerCase().includes("male"));

  if (!selectedVoice) selectedVoice = voices[0];
  utterance.voice = selectedVoice;

  utterance.pitch = useFemale ? (0.3 + Math.random() * 0.3) : (0.1 + Math.random() * 0.2);
  utterance.rate = 0.4 + Math.random() * 0.2;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();
  const synth = window.speechSynthesis;
  const recorder = new MediaRecorder(dest.stream);
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const audioURL = URL.createObjectURL(blob);

    const source = audioCtx.createBufferSource();
    fetch(audioURL)
      .then(res => res.arrayBuffer())
      .then(buffer => audioCtx.decodeAudioData(buffer, decoded => {
        source.buffer = decoded;

        // === NODOS DE EFECTOS ===

        // Distorsión
        const distortion = audioCtx.createWaveShaper();
        function makeDistortionCurve(amount) {
          const k = typeof amount === 'number' ? amount : 50;
          const n_samples = 44100;
          const curve = new Float32Array(n_samples);
          const deg = Math.PI / 180;
          for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
          }
          return curve;
        }
        distortion.curve = makeDistortionCurve(20);
        distortion.oversample = '4x';

        // Filtro de paso banda (radio antigua)
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.6;

        // Eco
        const delay = audioCtx.createDelay();
        delay.delayTime.value = 0.25;
        const feedback = audioCtx.createGain();
        feedback.gain.value = 0.4;
        delay.connect(feedback);
        feedback.connect(delay);

        // Conexiones
        const output = audioCtx.destination;
        source.connect(distortion);
        distortion.connect(filter);
        filter.connect(delay);
        delay.connect(output);
        filter.connect(output); // sonido directo + eco

        source.start(0);
      }));
  };

  recorder.start();
  synth.speak(utterance);
  setTimeout(() => recorder.stop(), 3000);
}
