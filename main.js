document.addEventListener('DOMContentLoaded', function() {
            const PLAYER_RED = 'red';
            const PLAYER_BLUE = 'blue';
            const EDGE_WEIGHTS = { outer: 1, middle: 2, inner: 3 };
            const TOTAL_TITANS = 4;
            const GAME_DURATION = 600;
            const TURN_DURATION = 60;
            
            let gameState = {
                currentPlayer: PLAYER_RED,
                phase: 'placement',
                unlockedCircuit: 'outer',
                gameTimer: GAME_DURATION,
                turnTimer: TURN_DURATION,
                gameActive: false,
                paused: false,
                nodes: [],
                edges: [],
                players: {
                    [PLAYER_RED]: { score: 0, titansPlaced: 0, titansRemaining: TOTAL_TITANS },
                    [PLAYER_BLUE]: { score: 0, titansPlaced: 0, titansRemaining: TOTAL_TITANS }
                },
                selectedNode: null
            };
            
            const gameBoard = document.querySelector('.hex-grid');
            const redPlayerInfo = document.querySelector('.player-info.red');
            const bluePlayerInfo = document.querySelector('.player-info.blue');
            const gameTimerDisplay = document.querySelector('.game-timer');
            const turnTimerDisplay = document.querySelector('.turn-timer');
            const pauseBtn = document.getElementById('pause-btn');
            const resumeBtn = document.getElementById('resume-btn');
            const resetBtn = document.getElementById('reset-btn');
            const gameModal = document.getElementById('game-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalMessage = document.getElementById('modal-message');
            const modalButton = document.getElementById('modal-button');
            
            function initGame() {
                gameState = {
                    currentPlayer: PLAYER_RED,
                    phase: 'placement',
                    unlockedCircuit: 'outer',
                    gameTimer: GAME_DURATION,
                    turnTimer: TURN_DURATION,
                    gameActive: true,
                    paused: false,
                    nodes: [],
                    edges: [],
                    players: {
                        [PLAYER_RED]: { score: 0, titansPlaced: 0, titansRemaining: TOTAL_TITANS },
                        [PLAYER_BLUE]: { score: 0, titansPlaced: 0, titansRemaining: TOTAL_TITANS }
                    },
                    selectedNode: null
                };
                
                gameBoard.innerHTML = '';
                createHexGrid();
                updatePlayerInfo();
                updateTimers();
                startGameLoop();
                setupEventListeners();
            }
            
            function createHexGrid() {
                const centerX = 50, centerY = 50;
                const circuits = [
                    { name: 'outer', radius: 40, weight: EDGE_WEIGHTS.outer },
                    { name: 'middle', radius: 26.66, weight: EDGE_WEIGHTS.middle },
                    { name: 'inner', radius: 13.33, weight: EDGE_WEIGHTS.inner }
                ];
                
                circuits.forEach(circuit => {
                    for (let i = 0; i < 6; i++) {
                        const angle = (i * 60) * (Math.PI / 180);
                        const x = centerX + circuit.radius * Math.cos(angle);
                        const y = centerY + circuit.radius * Math.sin(angle);
                        
                        const node = {
                            id: `${circuit.name}-${i}`,
                            circuit: circuit.name,
                            index: i,
                            x, y,
                            occupied: null,
                            element: null
                        };
                        
                        gameState.nodes.push(node);
                        createNodeElement(node);
                    }
                });
                
                createEdges();
            }
            
            function createNodeElement(node) {
                const nodeElement = document.createElement('div');
                nodeElement.className = 'hex-node';
                nodeElement.id = `node-${node.id}`;
                nodeElement.style.left = `${node.x}%`;
                nodeElement.style.top = `${node.y}%`;
                node.element = nodeElement;
                gameBoard.appendChild(nodeElement);
                nodeElement.addEventListener('click', () => handleNodeClick(node));
            }
            
            function createEdges() {
                gameState.nodes.forEach((node, index) => {
                    const nextIndex = (node.index + 1) % 6;
                    const nextNode = gameState.nodes.find(n => n.circuit === node.circuit && n.index === nextIndex);
                    if (nextNode) createEdgeElement(node, nextNode, node.circuit);
                    
                    if (node.index % 2 === 1 && node.circuit === 'outer') {
    const middleNode = gameState.nodes.find(n => n.circuit === 'middle' && n.index === node.index);
    if (middleNode) createEdgeElement(node, middleNode, 'middle');
} else if (node.index % 2 === 0 && node.circuit === 'middle') {
    const innerNode = gameState.nodes.find(n => n.circuit === 'inner' && n.index === node.index);
    if (innerNode) createEdgeElement(node, innerNode, 'inner');
}



                });
            }
            
            function createEdgeElement(node1, node2, circuitType) {
                const x1 = node1.x, y1 = node1.y, x2 = node2.x, y2 = node2.y;
                const dx = x2 - x1, dy = y2 - y1;
                const length = Math.sqrt(dx * dx + dy * dy) * 0.01 * gameBoard.offsetWidth;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                const edgeElement = document.createElement('div');
                edgeElement.className = 'hex-edge';
                edgeElement.style.left = `${x1}%`;
                edgeElement.style.top = `${y1}%`;
                edgeElement.style.width = `${length}px`;
                edgeElement.style.height = '2px';
                edgeElement.style.transform = `rotate(${angle}deg)`;
                
                const weight = EDGE_WEIGHTS[circuitType] || EDGE_WEIGHTS.outer;
                const weightElement = document.createElement('div');
                weightElement.className = 'edge-weight';
                weightElement.textContent = weight;
                weightElement.style.left = `${(x1 + x2) / 2}%`;
                weightElement.style.top = `${(y1 + y2) / 2}%`;
                
                gameBoard.appendChild(edgeElement);
                gameBoard.appendChild(weightElement);
                
                gameState.edges.push({
                    node1: node1.id,
                    node2: node2.id,
                    weight,
                    controlledBy: null,
                    element: edgeElement,
                    weightElement
                });
            }
            
            function handleNodeClick(node) {
                if (!gameState.gameActive || gameState.paused) return;
                
                if (gameState.phase === 'placement') {
                    if (node.circuit !== gameState.unlockedCircuit || node.occupied) return;
                    
                    node.occupied = gameState.currentPlayer;
                    node.element.classList.add(gameState.currentPlayer);
                    
                    const player = gameState.players[gameState.currentPlayer];
                    player.titansPlaced++;
                    player.titansRemaining--;
                    
                    checkCircuitFull();
                    
                    if (player.titansRemaining === 0 && 
                        gameState.players[gameState.currentPlayer === PLAYER_RED ? PLAYER_BLUE : PLAYER_RED].titansRemaining === 0) {
                        gameState.phase = 'movement';
                    }
                    
                    updateScores();
                    switchPlayer();
                    updatePlayerInfo();
                } else {
                    if (!gameState.selectedNode) {
                        if (node.occupied === gameState.currentPlayer) {
                            gameState.selectedNode = node;
                            node.element.classList.add('highlight');
                        }
                        return;
                    }
                    
                    if (node.id === gameState.selectedNode.id) {
                        resetNodeSelection();
                        return;
                    }
                    
                    const adjacentNodes = getAdjacentNodes(gameState.selectedNode);
                    const isAdjacent = adjacentNodes.some(adjNode => adjNode.id === node.id);
                    
                    if (isAdjacent && !node.occupied) {
                        gameState.selectedNode.occupied = null;
                        gameState.selectedNode.element.classList.remove(gameState.currentPlayer);
                        gameState.selectedNode.element.classList.remove('highlight');
                        
                        node.occupied = gameState.currentPlayer;
                        node.element.classList.add(gameState.currentPlayer);
                        
                        checkCapturedTitans();
                        updateScores();
                        switchPlayer();
                        updatePlayerInfo();
                    }
                    
                    resetNodeSelection();
                }
            }
            
            function resetNodeSelection() {
                if (gameState.selectedNode) {
                    gameState.selectedNode.element.classList.remove('highlight');
                    gameState.selectedNode = null;
                }
            }
            
            function getAdjacentNodes(node) {
                const adjacentNodes = [];
                
                const sameCircuitNodes = gameState.nodes.filter(n => 
                    n.circuit === node.circuit && 
                    (n.index === (node.index + 1) % 6 || n.index === (node.index - 1 + 6) % 6)
                );
                adjacentNodes.push(...sameCircuitNodes);
                
                if (node.circuit === 'outer') {
                    const middleNode = gameState.nodes.find(n => n.circuit === 'middle' && n.index === node.index);
                    if (middleNode) adjacentNodes.push(middleNode);
                } else if (node.circuit === 'middle') {
                    const outerNode = gameState.nodes.find(n => n.circuit === 'outer' && n.index === node.index);
                    const innerNode = gameState.nodes.find(n => n.circuit === 'inner' && n.index === node.index);
                    if (outerNode) adjacentNodes.push(outerNode);
                    if (innerNode) adjacentNodes.push(innerNode);
                } else if (node.circuit === 'inner') {
                    const middleNode = gameState.nodes.find(n => n.circuit === 'middle' && n.index === node.index);
                    if (middleNode) adjacentNodes.push(middleNode);
                }
                
                return adjacentNodes;
            }
            
            function checkCircuitFull() {
                const nodesInCircuit = gameState.nodes.filter(n => n.circuit === gameState.unlockedCircuit);
                const isFull = nodesInCircuit.every(n => n.occupied);
                
                if (isFull) {
                    if (gameState.unlockedCircuit === 'outer') gameState.unlockedCircuit = 'middle';
                    else if (gameState.unlockedCircuit === 'middle') gameState.unlockedCircuit = 'inner';
                    else endGame();
                }
            }
            
            function checkCapturedTitans() {
                gameState.nodes.forEach(node => {
                    if (node.occupied) {
                        const adjacentNodes = getAdjacentNodes(node);
                        const allAdjacentOpponent = adjacentNodes.every(adjNode => 
                            adjNode.occupied && adjNode.occupied !== node.occupied
                        );
                        
                        if (allAdjacentOpponent && adjacentNodes.length > 0) {
                            const player = node.occupied;
                            gameState.players[player].titansPlaced--;
                            
                            node.occupied = null;
                            node.element.classList.remove(player);
                            
                            if (gameState.players[player].titansPlaced === 0) endGame();
                        }
                    }
                });
            }
            
            function updateScores() {
                gameState.edges.forEach(edge => {
                    edge.controlledBy = null;
                    edge.element.style.backgroundColor = '';
                });
                
                gameState.players[PLAYER_RED].score = 0;
                gameState.players[PLAYER_BLUE].score = 0;
                
                gameState.edges.forEach(edge => {
                    const node1 = gameState.nodes.find(n => n.id === edge.node1);
                    const node2 = gameState.nodes.find(n => n.id === edge.node2);
                    
                    if (node1.occupied && node2.occupied && node1.occupied === node2.occupied) {
                        const player = node1.occupied;
                        edge.controlledBy = player;
                        edge.element.style.backgroundColor = player === PLAYER_RED ? 'var(--red-player)' : 'var(--blue-player)';
                        gameState.players[player].score += edge.weight;
                    }
                });
                
                updatePlayerInfo();
            }
            
            function switchPlayer() {
                gameState.currentPlayer = gameState.currentPlayer === PLAYER_RED ? PLAYER_BLUE : PLAYER_RED;
                gameState.turnTimer = TURN_DURATION;
                redPlayerInfo.style.border = gameState.currentPlayer === PLAYER_RED ? '3px solid var(--highlight)' : '';
                bluePlayerInfo.style.border = gameState.currentPlayer === PLAYER_BLUE ? '3px solid var(--highlight)' : '';
            }
            
            function updatePlayerInfo() {
                document.querySelector('.player-info.red .player-score').textContent = `Score: ${gameState.players[PLAYER_RED].score}`;
                document.querySelector('.player-info.red .player-titans').textContent = `Titans: ${gameState.players[PLAYER_RED].titansRemaining}`;
                document.querySelector('.player-info.blue .player-score').textContent = `Score: ${gameState.players[PLAYER_BLUE].score}`;
                document.querySelector('.player-info.blue .player-titans').textContent = `Titans: ${gameState.players[PLAYER_BLUE].titansRemaining}`;
            }
            
            function updateTimers() {
                const gameMinutes = Math.floor(gameState.gameTimer / 60);
                const gameSeconds = gameState.gameTimer % 60;
                gameTimerDisplay.textContent = `Game Time: ${gameMinutes}:${gameSeconds < 10 ? '0' : ''}${gameSeconds}`;
                
                const turnMinutes = Math.floor(gameState.turnTimer / 60);
                const turnSeconds = gameState.turnTimer % 60;
                turnTimerDisplay.textContent = `Turn Time: ${turnMinutes}:${turnSeconds < 10 ? '0' : ''}${turnSeconds}`;
            }
            
            function startGameLoop() {
                gameState.gameLoop = setInterval(() => {
                    if (!gameState.paused && gameState.gameActive) {
                        if (gameState.gameTimer > 0) gameState.gameTimer--;
                        else { endGame(); return; }
                        
                        if (gameState.turnTimer > 0) gameState.turnTimer--;
                        else switchPlayer();
                        
                        updateTimers();
                    }
                }, 1000);
            }
            
            function endGame() {
                gameState.gameActive = false;
                clearInterval(gameState.gameLoop);
                
                let winner = null;
                if (gameState.players[PLAYER_RED].score > gameState.players[PLAYER_BLUE].score) winner = 'Red Player';
                else if (gameState.players[PLAYER_BLUE].score > gameState.players[PLAYER_RED].score) winner = 'Blue Player';
                else winner = 'It\'s a tie!';
                
                modalTitle.textContent = 'Game Over';
                modalMessage.textContent = winner === 'It\'s a tie!' ? 
                    'The game ended in a tie!' : 
                    `${winner} wins with ${Math.max(gameState.players[PLAYER_RED].score, gameState.players[PLAYER_BLUE].score)} points!`;
                
                gameModal.style.display = 'flex';
            }
            
            function setupEventListeners() {
                pauseBtn.addEventListener('click', () => {
                    gameState.paused = true;
                    pauseBtn.disabled = true;
                    resumeBtn.disabled = false;
                });
                
                resumeBtn.addEventListener('click', () => {
                    gameState.paused = false;
                    pauseBtn.disabled = false;
                    resumeBtn.disabled = true;
                });
                
                resetBtn.addEventListener('click', () => {
                    if (confirm('Reset game?')) initGame();
                });
                
                modalButton.addEventListener('click', () => { gameModal.style.display = 'none'; initGame(); });
                
                window.addEventListener('click', (e) => {
                    if (e.target === gameModal) gameModal.style.display = 'none';
                });
            }
            
            initGame();
        });