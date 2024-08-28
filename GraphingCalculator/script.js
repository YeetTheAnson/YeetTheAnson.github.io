let cursorPosition = 0;
let displayContent = '';
let chart = null;

function updateDisplay() {
    let displayElement = document.getElementById('display');
    let cursorElement = document.getElementById('cursor');
    let formattedContent = displayContent.replace(/\*/g, '×').replace(/\//g, '÷');
    let beforeCursor = formattedContent.slice(0, cursorPosition);
    let afterCursor = formattedContent.slice(cursorPosition);
    displayElement.value = beforeCursor + '|' + afterCursor;
    let tempElement = document.createElement('span');
    tempElement.style.visibility = 'hidden';
    tempElement.style.position = 'absolute';
    tempElement.style.whiteSpace = 'pre';
    tempElement.textContent = beforeCursor;
    document.body.appendChild(tempElement);
    cursorElement.style.left = (tempElement.offsetWidth + 10) + 'px';
    document.body.removeChild(tempElement);
}

function clearDisplay() {
    displayContent = '';
    cursorPosition = 0;
    updateDisplay();
}

function removeLastCharacter() {
    if (cursorPosition > 0) {
        displayContent = displayContent.slice(0, cursorPosition - 1) + displayContent.slice(cursorPosition);
        cursorPosition--;
        updateDisplay();
    }
}

function addNumber(number) {
    displayContent = displayContent.slice(0, cursorPosition) + number + displayContent.slice(cursorPosition);
    cursorPosition++;
    updateDisplay();
}

function addOperator(operator) {
    if (operator === '^') {
        displayContent = displayContent.slice(0, cursorPosition) + '^(' + displayContent.slice(cursorPosition);
        cursorPosition += 2;
    } else {
        displayContent = displayContent.slice(0, cursorPosition) + operator + displayContent.slice(cursorPosition);
        cursorPosition++;
    }
    updateDisplay();
}

function addVariable(variable) {
    if (cursorPosition > 0 && /\d/.test(displayContent[cursorPosition - 1])) {
        displayContent = displayContent.slice(0, cursorPosition) + '*' + variable + displayContent.slice(cursorPosition);
        cursorPosition += 2;
    } else {
        displayContent = displayContent.slice(0, cursorPosition) + variable + displayContent.slice(cursorPosition);
        cursorPosition++;
    }
    updateDisplay();
}

function addFunction(func) {
    displayContent = displayContent.slice(0, cursorPosition) + func + '(' + displayContent.slice(cursorPosition);
    cursorPosition += func.length + 1;
    updateDisplay();
}

function addFraction() {
    displayContent = displayContent.slice(0, cursorPosition) + '()/()' + displayContent.slice(cursorPosition);
    cursorPosition += 2;
    updateDisplay();
}

function moveCursor(direction) {
    switch (direction) {
        case 'left':
            if (cursorPosition > 0) cursorPosition--;
            break;
        case 'right':
            if (cursorPosition < displayContent.length) cursorPosition++;
            break;
        case 'up':
            let fracStart = displayContent.lastIndexOf('(', cursorPosition - 1);
            if (fracStart !== -1 && displayContent[fracStart - 1] === '/') {
                cursorPosition = fracStart + 1;
            }
            break;
        case 'down':
            let fracEnd = displayContent.indexOf(')', cursorPosition);
            if (fracEnd !== -1 && displayContent[fracEnd + 1] === '/') {
                cursorPosition = fracEnd + 3;
            }
            break;
    }
    updateDisplay();
}

function calculateResult() {
    try {
        let result = eval(parseExpression(displayContent));
        displayContent = result.toString();
        cursorPosition = displayContent.length;
        updateDisplay();
    } catch (error) {
        displayContent = 'Error';
        cursorPosition = displayContent.length;
        updateDisplay();
    }
}

function parseExpression(expr) {
    return expr
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/\^/g, '**')
        .replace(/(\d+|[)x])(?=[([a-zA-Z])/g, '$1*');
}

function isInvalidValueForFunction(x, expression) {
    if (/sqrt\(/.test(expression) && x < 0) return true;
    if (/log\(/.test(expression) && x <= 0) return true;
    if (/ln\(/.test(expression) && x <= 0) return true;
    if (/1\//.test(expression) && x === 0) return true;
    if (/tan\(/.test(expression)) {
        let period = Math.PI / 2;
        let angle = eval(expression.match(/tan\((.*?)\)/)[1].replace(/x/g, `(${x})`));
        if (Math.abs(angle % period) < 0.0001) return true;
    }
    return false;
}

function drawGraph() {
    if (chart) {
        chart.destroy();
    }

    let domainStart = parseFloat(document.getElementById('domain-start').value);
    let domainEnd = parseFloat(document.getElementById('domain-end').value);

    let xValues = [];
    let yValues = [];
    let numPoints = 5000;
    let deltaX = (domainEnd - domainStart) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
        let x = domainStart + i * deltaX;
        if (isInvalidValueForFunction(x, displayContent)) continue;

        let y;
        try {
            y = eval(parseExpression(displayContent.replace(/x/g, `(${x})`)));
        } catch (error) {
            y = NaN;
        }

        if (!isNaN(y)) {
            xValues.push(x);
            yValues.push(y);
        }
    }

    let ctx = document.getElementById('graph-canvas').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: xValues,
            datasets: [{
                label: 'f(x)',
                data: yValues.map((y, i) => ({ x: xValues[i], y })),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'x',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'f(x)',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            }
        }
    });
}

function handleKeyPress(event) {
    const key = event.key;
    if (/[0-9]/.test(key)) {
        addNumber(key);
    } else if (['+', '-', '*', '/', '(', ')', '.'].includes(key)) {
        addOperator(key);
    } else if (key === 'x' || key === 'X') {
        addVariable('x');
    } else if (key === '^') {
        addOperator('^');
    } else if (key === 'Enter') {
        calculateResult();
    } else if (key === 'Backspace') {
        removeLastCharacter();
    } else if (key === 'ArrowLeft') {
        moveCursor('left');
    } else if (key === 'ArrowRight') {
        moveCursor('right');
    } else if (key === 'ArrowUp') {
        moveCursor('up');
    } else if (key === 'ArrowDown') {
        moveCursor('down');
    }
    event.preventDefault();
}

function initCalculator() {
    updateDisplay();
    document.addEventListener('keydown', handleKeyPress);
}

window.onload = initCalculator;
