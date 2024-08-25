if (window.location.protocol === 'https:') {
    window.location.href = window.location.href.replace('https:', 'http:');
}

let socket;
let isHost = false;
let myBatteryLevel;
const connectButton = document.getElementById('connect-button');
const hostButton = document.getElementById('host-button');
const joinButton = document.getElementById('join-button');
const joinCode = document.getElementById('join-code');
const statusMessage = document.getElementById('status-message');
const serverIp = document.getElementById('server-ip');
const serverPort = document.getElementById('server-port');
const controlsContainer = document.getElementById('controls-container');
const userListContainer = document.getElementById('user-list-container');
const userListUl = document.getElementById('user-list-ul');
const gameBox = document.querySelector('.game-box');
const startButton = document.querySelector('.start-button');
const canvas = document.getElementById("hockeyTable");
const ctx = canvas.getContext("2d");
const paddleSize = 50;
const puckSize = 20;
const friction = 0.99;
let goalSize = canvas.height / 3;
let paddle1, paddle2, puck;
let isGameRunning = false;
let activePaddle = null;

class Paddle {
    constructor(x, y, color, side) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.side = side;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, paddleSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    updatePosition(mouseX, mouseY) {
        this.vx = mouseX - this.x;
        this.vy = mouseY - this.y;

        this.x = mouseX;
        this.y = mouseY;

        if (this.side === 'left') {
            if (this.x > canvas.width / 2 - paddleSize / 2) this.x = canvas.width / 2 - paddleSize / 2;
        } else {
            if (this.x < canvas.width / 2 + paddleSize / 2) this.x = canvas.width / 2 + paddleSize / 2;
        }

        if (this.x < paddleSize / 2) this.x = paddleSize / 2;
        if (this.y < paddleSize / 2) this.y = paddleSize / 2;
        if (this.y > canvas.height - paddleSize / 2) this.y = canvas.height - paddleSize / 2;
    }

    isMouseOver(mouseX, mouseY) {
        return Math.hypot(mouseX - this.x, mouseY - this.y) < paddleSize / 2;
    }
}

class Puck {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, puckSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#3498db";
        ctx.fill();
        ctx.closePath();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.y < puckSize / 2 || this.y > canvas.height - puckSize / 2) {
            this.vy *= -1;
        }

        if ((this.x < puckSize / 2 && !isInGoal(this.y)) || 
            (this.x > canvas.width - puckSize / 2 && !isInGoal(this.y))) {
            this.vx *= -1;
        }
        this.vx *= friction;
        this.vy *= friction;
    }

    setVelocity(vx, vy) {
        this.vx = vx;
        this.vy = vy;
    }
}

function detectCollision(paddle, puck) {
    const dx = puck.x - paddle.x;
    const dy = puck.y - paddle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < paddleSize / 2 + puckSize / 2) {
        const normalX = dx / distance;
        const normalY = dy / distance;
        const relativeVx = puck.vx - paddle.vx;
        const relativeVy = puck.vy - paddle.vy;
        const dotProduct = relativeVx * normalX + relativeVy * normalY;
        puck.vx = relativeVx - 2 * dotProduct * normalX;
        puck.vy = relativeVy - 2 * dotProduct * normalY;
        dampingFactor = 0.0000000000000000001;
        puck.vx += paddle.vx * dampingFactor;
        puck.vy += paddle.vy * dampingFactor;
    }
}

function isInGoal(y) {
    return y > (canvas.height - goalSize) / 2 && y < (canvas.height + goalSize) / 2;
}

function checkGoal() {
    if (puck.x < puckSize / 2) {
        if (isInGoal(puck.y)) {
            gameOver("Right Player Wins!", !isHost);
        }
    } else if (puck.x > canvas.width - puckSize / 2) {
        if (isInGoal(puck.y)) {
            gameOver("Left Player Wins!", isHost);
        }
    }
}

function gameOver(winner, isWinner) {
    isGameRunning = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGoals();
    paddle1.draw();
    paddle2.draw();
    puck.draw();

    const winnerMessageElement = document.getElementById("winnerMessage");
    winnerMessageElement.textContent = isWinner ? "You Won!" : "You Lost!";
    winnerMessageElement.style.display = "block";

    setTimeout(() => {
        winnerMessageElement.style.display = "none";
        if (isHost) {
            document.getElementById("startButton").style.display = "block";
        }
    }, 2000);

    if (isHost) {
        socket.send(JSON.stringify({
            type: 'gameOver',
            winner: winner,
            isWinner: winner === "Left Player Wins!"
        }));
    }
}

function startGame() {
    isGameRunning = true;
    goalSize = canvas.height / 3;
    document.getElementById("startButton").style.display = "none";

    paddle1 = new Paddle(canvas.width / 4, canvas.height / 2, "#e74c3c", "left");
    paddle2 = new Paddle((canvas.width * 3) / 4, canvas.height / 2, "#2ecc71", "right");
    puck = new Puck(canvas.width / 2, canvas.height / 2);

    if (isHost) {
        socket.send(JSON.stringify({ type: 'gameStart' }));
    }

    animate();
}
function sendPaddleMove(x, y, side) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'paddleMove',
            x: x,
            y: y,
            side: side
        }));
    }
}

function animate() {
    if (!isGameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGoals();
    paddle1.draw();
    paddle2.draw();

    if (isHost) {
        puck.update();
        detectCollision(paddle1, puck);
        detectCollision(paddle2, puck);
        checkGoal();
        sendPuckUpdate();
    }

    puck.draw();

    requestAnimationFrame(animate);
}


function sendPuckUpdate() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'puckUpdate',
            x: puck.x,
            y: puck.y,
            vx: puck.vx,
            vy: puck.vy
        }));
    }
}



function drawGoals() {
    ctx.fillStyle = "#ecf0f1";
    ctx.fillRect(0, (canvas.height - goalSize) / 2, 10, goalSize); 
    ctx.fillRect(canvas.width - 10, (canvas.height - goalSize) / 2, 10, goalSize); 
}

document.getElementById("startButton").addEventListener("click", startGame);

canvas.addEventListener("mousedown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isHost && paddle1.isMouseOver(mouseX, mouseY)) {
        activePaddle = paddle1;
    } else if (!isHost && paddle2.isMouseOver(mouseX, mouseY)) {
        activePaddle = paddle2;
    }
});

canvas.addEventListener("mousemove", (event) => {
    if (!activePaddle) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if ((isHost && activePaddle === paddle1) || (!isHost && activePaddle === paddle2)) {
        activePaddle.updatePosition(mouseX, mouseY);
        sendPaddleMove(mouseX, mouseY, isHost ? 'left' : 'right');
    }
});

canvas.addEventListener("mouseup", () => {
    activePaddle = null;
});

window.addEventListener("resize", () => {
    canvas.width = document.querySelector('.game-box').offsetWidth;
    canvas.height = document.querySelector('.game-box').offsetHeight;

    goalSize = canvas.height / 3;
    if (paddle1) {
        paddle1.updatePosition(paddle1.x, paddle1.y);
    }
    if (paddle2) {
        paddle2.updatePosition(paddle2.x, paddle2.y);
    }
});

function connectToServer(ip, port) {
    return new Promise((resolve, reject) => {
        const url = `ws://${ip}:${port}`;
        console.log('Connecting to:', url); 
        socket = new WebSocket(url);

        socket.onopen = () => {
            console.log('Connected to server');
            statusMessage.textContent = 'Connected to server';
            controlsContainer.style.display = 'block';
            resolve(socket);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            statusMessage.textContent = 'Failed to connect to the server. Please check the IP and port.';
            reject(error);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };
    });
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'hostSuccess':
            isHost = true;
            statusMessage.textContent = `Successfully hosting server with code: ${data.code}`;
            hideGameSetupControls();
            userListContainer.style.display = 'block';
            gameBox.style.display = 'block';
            break;
        case 'joinSuccess':
            isHost = false;
            statusMessage.textContent = 'Successfully joined the server!';
            hideGameSetupControls();
            userListContainer.style.display = 'block';
            gameBox.style.display = 'block';
            break;
        case 'joinError':
            statusMessage.textContent = 'Server does not exist.';
            break;
        case 'updateUserList':
            updateUserList(data.users, data.isHost, data.hostIndex);
            break;
        case 'kicked':
            statusMessage.textContent = 'You have been kicked out of the room';
            resetRoomControls();
            break;
        case 'paddleMove':
            if ((isHost && data.side === 'right') || (!isHost && data.side === 'left')) {
                const paddleToMove = data.side === 'left' ? paddle1 : paddle2;
                paddleToMove.updatePosition(data.x, data.y);
            }
            break;
        case 'puckUpdate':
            if (!isHost) {
                puck.x = data.x;
                puck.y = data.y;
                puck.vx = data.vx;
                puck.vy = data.vy;
            }
            break;
        case 'gameStart':
            if (!isHost) {
                startGame();
            }
            break;
        case 'gameOver':
            gameOver(data.winner, data.isWinner);
            break;
    }
}

function hideGameSetupControls() {
    hostButton.style.display = 'none';
    joinButton.style.display = 'none';
    joinCode.style.display = 'none';
}

function showGameSetupControls() {
    hostButton.style.display = 'inline-block';
    joinButton.style.display = 'inline-block';
    joinCode.style.display = 'inline-block';
}

function resetRoomControls() {
    showGameSetupControls();
    userListContainer.style.display = 'none';
    controlsContainer.style.display = 'block';
    gameBox.style.display = 'none';
    startButton.style.backgroundColor = '#808080';
    startButton.style.pointerEvents = 'none';
    isHost = false;
}

function updateUserList(users, isHost, hostIndex) {
    userListUl.innerHTML = '';
    users.forEach((user, index) => {
        const li = document.createElement('li');
        li.textContent = `Device ${index + 1}: ${user}% Battery`;
        if (index === hostIndex) {
            li.textContent += ' (Host)';
        }
        if (isHost && index !== hostIndex) {
            const kickButton = document.createElement('button');
            kickButton.textContent = 'Kick';
            kickButton.onclick = () => {
                socket.send(JSON.stringify({ type: 'kick', user }));
            };
            li.appendChild(kickButton);
        } else if (isHost && index === hostIndex) {
            const leaveButton = document.createElement('button');
            leaveButton.textContent = 'Leave';
            leaveButton.onclick = () => {
                socket.send(JSON.stringify({ type: 'leave' }));
                statusMessage.textContent = 'You have left the room';
                resetRoomControls();
                socket.close();
            };
            li.appendChild(leaveButton);
        }
        if (users.length > 1 && isHost) {
            startButton.style.display = 'block';
            startButton.style.backgroundColor = '#27ae60';
            startButton.style.pointerEvents = 'auto';
        } else {
            startButton.style.display = 'none';
        }
        userListUl.appendChild(li);
    });

    if (users.length > 1) {
        startButton.style.backgroundColor = '#27ae60'; 
        startButton.style.pointerEvents = 'auto'; 
    } else {
        startButton.style.backgroundColor = '#808080'; 
        startButton.style.pointerEvents = 'none'; 
    }
}

function generateCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

async function getBatteryPercentage() {
    try {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
    } catch (e) {
        console.error('Error getting battery level:', e);
        return 'unknown';
    }
}

connectButton.addEventListener('click', () => {
    const ip = serverIp.value.trim();
    const port = serverPort.value.trim();

    if (ip && port) {
        connectToServer(ip, port).catch(error => {
            console.error('Failed to connect to server:', error);
        });
    } else {
        statusMessage.textContent = 'Please enter a valid IP address and port.';
    }
});

hostButton.addEventListener('click', async () => {
    const code = generateCode();
    myBatteryLevel = await getBatteryPercentage();
    socket.send(JSON.stringify({ type: 'host', code: code, user: myBatteryLevel }));
});

joinButton.addEventListener('click', async () => {
    const code = joinCode.value.trim();
    if (code.length === 6) {
        myBatteryLevel = await getBatteryPercentage();
        socket.send(JSON.stringify({ type: 'join', code: code, user: myBatteryLevel }));
    } else {
        statusMessage.textContent = 'Please enter a valid 6-character code.';
    }
});
