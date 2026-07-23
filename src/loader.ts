class PacmanLoader extends HTMLElement {
    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })
        shadow.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: radial-gradient(circle at center, #3a0814, #120205);
                    z-index: 9999;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    --pacman-color: #ffd866;
                    --ball-size: 15px;
                    --pacman-size: calc(var(--ball-size) * 2.5);
                }
                .pacman-loader {
                    position: relative;
                    width: 100px;
                    height: 50px;
                }
                .pacman-loader > div:nth-child(1),
                .pacman-loader > div:nth-child(2) {
                    border: var(--pacman-size) solid var(--pacman-color);
                    border-right-color: transparent;
                    border-radius: 50%;
                    width: 0;
                    height: 0;
                    left: calc(-1 * var(--ball-size) * 4);
                    position: relative;
                    animation: rotate-pacman-half-up .5s infinite;
                }
                .pacman-loader > div:nth-child(2) {
                    margin-top: calc(-1 * var(--pacman-size) * 2);
                    animation-name: rotate-pacman-half-down;
                }
                .pacman-loader > div:nth-child(3),
                .pacman-loader > div:nth-child(4),
                .pacman-loader > div:nth-child(5) {
                    background-color: var(--pacman-color);
                    border-radius: 50%;
                    width: var(--ball-size);
                    height: var(--ball-size);
                    top: calc(var(--ball-size) * 2);
                    left: calc(var(--pacman-size) * 2);
                    position: absolute;
                    animation: pacman-balls 1s infinite linear;
                }
                .pacman-loader > div:nth-child(3) {
                    animation-delay: -.66s;
                }
                .pacman-loader > div:nth-child(4) {
                    animation-delay: -.33s;
                }
                @keyframes rotate-pacman-half-up {
                    0% { transform: rotate(270deg); }
                    50% { transform: rotate(360deg); }
                    100% { transform: rotate(270deg); }
                }
                @keyframes rotate-pacman-half-down {
                    0% { transform: rotate(90deg); }
                    50% { transform: rotate(0); }
                    100% { transform: rotate(90deg); }
                }
                @keyframes pacman-balls {
                    75% { opacity: .7; }
                    100% { transform: translateX(calc(-1 * (var(--pacman-size) * 2.5))); }
                }
            </style>
            <div class="pacman-loader">
                <div></div><div></div><div></div><div></div><div></div>
            </div>
        `
    }
}

customElements.define('pacman-loader', PacmanLoader)