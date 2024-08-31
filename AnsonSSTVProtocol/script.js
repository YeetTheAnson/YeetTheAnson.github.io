document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const encodeButton = document.getElementById('encodeSSTV');
    const decodeButton = document.getElementById('decodeSSTV');
    const transmitButton = document.createElement('button');
    
    transmitButton.textContent = 'Transmit';
    transmitButton.id = 'transmitSSTV';
    transmitButton.style.display = 'none';
    document.querySelector('.container').appendChild(transmitButton);

    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 50;
    smallCanvas.height = 50;
    const smallCtx = smallCanvas.getContext('2d');

    const HEADER_BINARY = '011000010110111001110011011011110110111001110011011100110111010001110110';
    const LINE_END_BINARY = '01101100011010010110111001100101';
    const TONE_FREQUENCY_HEADER_HIGH = 700;
    const TONE_FREQUENCY_HEADER_LOW = 400;
    const TONE_FREQUENCY_PIXEL_SEPARATOR_1 = 700;
    const TONE_FREQUENCY_PIXEL_SEPARATOR_2 = 2200;
    const TONE_DURATION = 20;

    let imageMatrix = '';
    let imageData = null;
    let pixelIndex = 0;
    let lineIndex = 0;

    encodeButton.addEventListener('click', () => {
        dropArea.style.display = 'block';
        transmitButton.style.display = 'none';
    });

    decodeButton.addEventListener('click', () => {
        dropArea.style.display = 'none';
        transmitButton.style.display = 'none';
        startDecoding();
    });

    transmitButton.addEventListener('click', () => {
        transmitPayload();
    });

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropArea.style.backgroundColor = '#3c3c3c';
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.style.backgroundColor = '#2c2c2c';
    });

    dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dropArea.style.backgroundColor = '#2c2c2c';
        handleFile(event.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', () => {
        handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
                    ctx.drawImage(smallCanvas, 0, 0, canvas.width, canvas.height);
                    convertImageToMatrix();
                    transmitButton.style.display = 'block';
                };
                img.src = e.target.result;
                dropArea.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    function convertImageToMatrix() {
        const imageData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
        const { data } = imageData;
        let matrix = '';
        for (let y = 0; y < smallCanvas.height; y++) {
            let row = '';
            for (let x = 0; x < smallCanvas.width; x++) {
                const index = (y * smallCanvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                row += `${mapColorToFrequency(r)},${mapColorToFrequency(g)},${mapColorToFrequency(b)}`;
                if (x < smallCanvas.width - 1) row += ',';
            }
            matrix += row + '\n';
        }
        imageMatrix = matrix.trim();
        console.log('Converted Matrix:\n', imageMatrix);
    }

    function mapColorToFrequency(value) {
        return 900 + ((value / 255) * 1000);
    }

    function transmitPayload() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioCtx.sampleRate;
        const duration = calculateDuration();
        const payloadBuffer = audioCtx.createBuffer(1, sampleRate * duration / 1000, sampleRate);
        const data = payloadBuffer.getChannelData(0);

        let offset = 0;
        encodeBinary(HEADER_BINARY, data, offset, sampleRate, TONE_FREQUENCY_HEADER_HIGH, TONE_FREQUENCY_HEADER_LOW);
        offset += sampleRate * HEADER_BINARY.length * TONE_DURATION / 1000;

        imageMatrix.split('\n').forEach(line => {
            line.split(',').forEach(color => {
                encodeToneForColor(color, data, offset, sampleRate);
                offset += sampleRate * TONE_DURATION / 1000;
            });
            encodePixelSeparator(data, offset, sampleRate);
            offset += sampleRate * (TONE_DURATION * 2) / 1000;
            encodeBinary(LINE_END_BINARY, data, offset, sampleRate, TONE_FREQUENCY_HEADER_HIGH, TONE_FREQUENCY_HEADER_LOW);
            offset += sampleRate * LINE_END_BINARY.length * TONE_DURATION / 1000;
        });

        const source = audioCtx.createBufferSource();
        source.buffer = payloadBuffer;
        source.connect(audioCtx.destination);
        source.start();
        console.log('Payload transmission started.');
    }

    function calculateDuration() {
        const numPixels = smallCanvas.width * smallCanvas.height;
        return (HEADER_BINARY.length * TONE_DURATION) + 
               (numPixels * 3 * TONE_DURATION) + 
               (numPixels * (TONE_DURATION * 2)) + 
               (LINE_END_BINARY.length * TONE_DURATION * numPixels);
    }

    function encodeBinary(binaryString, data, offset, sampleRate, freqHigh, freqLow) {
        binaryString.split('').forEach(bit => {
            const duration = sampleRate * TONE_DURATION / 1000;
            if (bit === '1') {
                generateTone(data, offset, duration, freqHigh, sampleRate);
            } else {
                generateTone(data, offset, duration, freqLow, sampleRate);
            }
            offset += duration;
        });
    }

    function encodeToneForColor(color, data, offset, sampleRate) {
        const frequencies = color.split(',').map(value => mapColorToFrequency(parseInt(value, 10)));
        frequencies.forEach(frequency => {
            generateTone(data, offset, sampleRate * TONE_DURATION / 1000, frequency, sampleRate);
            offset += sampleRate * TONE_DURATION / 1000;
        });
    }

    function encodePixelSeparator(data, offset, sampleRate) {
        generateTone(data, offset, sampleRate * TONE_DURATION / 1000, TONE_FREQUENCY_PIXEL_SEPARATOR_1, sampleRate);
        offset += sampleRate * TONE_DURATION / 1000;
        generateTone(data, offset, sampleRate * TONE_DURATION / 1000, TONE_FREQUENCY_PIXEL_SEPARATOR_2, sampleRate);
    }

    function generateTone(data, offset, duration, frequency, sampleRate) {
        const period = sampleRate / frequency;
        const amplitude = 0.5;
        for (let i = 0; i < duration; i++) {
            const t = (offset + i) % period;
            data[offset + i] = amplitude * Math.sin(2 * Math.PI * t / period);
        }
    }

    function startDecoding() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.3;
                source.connect(analyser);

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const spectrogramCanvas = document.createElement('canvas');
                spectrogramCanvas.width = 800;
                spectrogramCanvas.height = 600;
                const spectrogramCtx = spectrogramCanvas.getContext('2d');
                document.querySelector('.container').appendChild(spectrogramCanvas);

                function drawSpectrogram() {
                    analyser.getByteFrequencyData(dataArray);

                    const imageData = spectrogramCtx.getImageData(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
                    spectrogramCtx.putImageData(imageData, 0, 1);

                    //NOTE TO REVIEWER: THIS SECTION IS WRITTEN BY CHATGPT
                    for (let i = 0; i < bufferLength; i++) {
                        const value = dataArray[i];
                        const percent = value / 255;
                        const height = spectrogramCanvas.height * percent;
                        const offset = spectrogramCanvas.height - height - 1;
                        const barWidth = spectrogramCanvas.width / bufferLength;
                        spectrogramCtx.fillStyle = `rgb(${value}, ${value}, ${value})`;
                        spectrogramCtx.fillRect(i * barWidth, offset, barWidth, height);
                    }
                    //END OF SECTION

                    requestAnimationFrame(drawSpectrogram);
                }

                drawSpectrogram();
            })
            .catch(err => {
                console.error('Error accessing microphone: ', err);
            });
    }

    function reconstructImageFromData(dataArray) {
        const width = smallCanvas.width;
        const height = smallCanvas.height;
        const imageData = smallCtx.createImageData(width, height);
        const data = imageData.data;

        let index = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = decodeFrequency(dataArray[index++]);
                const g = decodeFrequency(dataArray[index++]);
                const b = decodeFrequency(dataArray[index++]);

                const pixelIndex = (y * width + x) * 4;
                data[pixelIndex] = r;
                data[pixelIndex + 1] = g;
                data[pixelIndex + 2] = b;
                data[pixelIndex + 3] = 255;
            }
        }

        smallCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(smallCanvas, 0, 0, canvas.width, canvas.height);
    }

    function decodeFrequency(value) {
        return Math.round(((value - 900) / 1000) * 255);
    }
})