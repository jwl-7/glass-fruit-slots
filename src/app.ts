import * as THREE from 'three'
import gsap from 'gsap'

export class SlotMachineApp extends HTMLElement {
    scene!: THREE.Scene
    camera!: THREE.PerspectiveCamera
    renderer!: THREE.WebGLRenderer
    machineGroup!: THREE.Group
    armPivot!: THREE.Group
    glowFrameMat!: THREE.MeshBasicMaterial
    pointLight!: THREE.PointLight
    marqueeMat!: THREE.MeshBasicMaterial
    reels: { group: THREE.Group; currentIdx: number }[] = []
    symbolTextures: THREE.CanvasTexture[] = []
    symbolsList = ['🍒', '🍋', '🍊', '🍇', '🍉', '⭐', '7️⃣']
    isSpinning = false
    particleGeo!: THREE.BufferGeometry
    animId: number = 0
    resizeHandler = () => this.onWindowResize()

    constructor() {
        super()
    }

    connectedCallback() {
        this.injectStyles()
        this.initThree()
        this.setupListeners()
        this.tick()
    }

    disconnectedCallback() {
        cancelAnimationFrame(this.animId)
        window.removeEventListener('resize', this.resizeHandler)
        this.renderer.dispose()
    }

    injectStyles() {
        if (!document.getElementById('slot-machine-styles')) {
            const style = document.createElement('style')
            style.id = 'slot-machine-styles'
            style.textContent = `
                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background-color: #ffd700;
                    top: -10px;
                    z-index: 1000;
                    pointer-events: none;
                    opacity: 0.9;
                }
            `
            document.head.appendChild(style)
        }
    }

    createSymbolTexture(text: string): THREE.CanvasTexture {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')!

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 512, 512)

        ctx.strokeStyle = '#e8e8f0'
        ctx.lineWidth = 24
        ctx.strokeRect(0, 0, 512, 512)

        ctx.font = '220px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(0,0,0,0.15)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetY = 8
        ctx.fillText(text, 256, 256)

        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        return texture
    }

    createMarqueeTexture(text = "SLOT MACHINE"): THREE.CanvasTexture {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 256
        const ctx = canvas.getContext('2d')!

        const bgGrad = ctx.createLinearGradient(0, 0, 0, 256)
        bgGrad.addColorStop(0, '#1a050b')
        bgGrad.addColorStop(0.5, '#080104')
        bgGrad.addColorStop(1, '#1a050b')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, 1024, 256)

        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 10
        ctx.strokeRect(14, 14, 996, 228)
        ctx.strokeStyle = '#ffaa00'
        ctx.lineWidth = 3
        ctx.strokeRect(22, 22, 980, 212)

        const fontSize = text.length > 8 ? 95 : 110
        ctx.font = `bold italic ${fontSize}px "Georgia", "Times New Roman", serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        ctx.shadowColor = '#ffea00'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 2

        ctx.lineWidth = 12
        ctx.strokeStyle = '#4a0012'
        ctx.strokeText(text, 512, 128)

        const textGrad = ctx.createLinearGradient(0, 50, 0, 200)
        textGrad.addColorStop(0, '#ffffff')
        textGrad.addColorStop(0.3, '#fff7ae')
        textGrad.addColorStop(0.7, '#ffd700')
        textGrad.addColorStop(1, '#cca100')
        ctx.fillStyle = textGrad
        ctx.fillText(text, 512, 128)

        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.needsUpdate = true
        return texture
    }

    initThree() {
        this.scene = new THREE.Scene()
        this.scene.fog = new THREE.FogExp2(0x2b050c, 0.04)

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.camera.position.set(0, 0, 8.2)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.appendChild(this.renderer.domElement)

        const ambientLight = new THREE.AmbientLight(0xffcccc, 1.2)
        this.scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xff8888, 1.5)
        directionalLight.position.set(5, 10, 7)
        directionalLight.castShadow = true
        this.scene.add(directionalLight)

        this.pointLight = new THREE.PointLight(0xff1744, 2.5, 10)
        this.pointLight.position.set(0, 0, 4)
        this.scene.add(this.pointLight)

        // Particles
        const particleCount = 70
        this.particleGeo = new THREE.BufferGeometry()
        const particlePos = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount * 3; i += 3) {
            particlePos[i] = (Math.random() - 0.5) * 12
            particlePos[i + 1] = (Math.random() - 0.5) * 12
            particlePos[i + 2] = (Math.random() - 0.5) * 6 - 2
        }
        this.particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
        const particleMat = new THREE.PointsMaterial({ color: 0xff3366, size: 0.06, transparent: true, opacity: 0.7 })
        const particleField = new THREE.Points(this.particleGeo, particleMat)
        this.scene.add(particleField)

        this.symbolTextures = this.symbolsList.map(s => this.createSymbolTexture(s))

        this.machineGroup = new THREE.Group()
        this.scene.add(this.machineGroup)

        const cabinetMat = new THREE.MeshPhysicalMaterial({
            color: 0xdc143c, emissive: 0x4a000d, roughness: 0.12, metalness: 0.15,
            transmission: 0.4, ior: 1.5, transparent: true, opacity: 0.95, depthWrite: false
        })
        const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 })
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05 })
        const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 })
        const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })

        // Cabinet Structure
        const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 2.2), cabinetMat)
        baseMesh.position.set(0, -1.8, -0.2)
        baseMesh.castShadow = true
        baseMesh.receiveShadow = true
        this.machineGroup.add(baseMesh)

        const footTrim = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.15, 2.3), goldTrimMat)
        footTrim.position.set(0, -2.4, -0.2)
        this.machineGroup.add(footTrim)

        for (let x of [-1.6, 1.6]) {
            for (let z of [-0.9, 0.8]) {
                const rubberFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.1, 16), rubberMat)
                rubberFoot.position.set(x, -2.5, z)
                this.machineGroup.add(rubberFoot)
            }
        }

        const midBodyMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 1.8), cabinetMat)
        midBodyMesh.position.set(0, 0.1, -0.1)
        midBodyMesh.castShadow = true
        midBodyMesh.receiveShadow = true
        this.machineGroup.add(midBodyMesh)

        for (let xDir of [-1.81, 1.81]) {
            const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 1.6), goldTrimMat)
            sidePanel.position.set(xDir, 0.1, -0.1)
            this.machineGroup.add(sidePanel)

            const sideInset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.9, 1.3), new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.4 }))
            sideInset.position.set(xDir > 0 ? 1.84 : -1.84, 0.1, -0.1)
            this.machineGroup.add(sideInset)
        }

        const topBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.4), cabinetMat)
        topBoxMesh.position.set(0, 2.0, -0.4)
        topBoxMesh.rotation.x = -0.15
        topBoxMesh.castShadow = true
        this.machineGroup.add(topBoxMesh)

        // Marquee
        const marqueeBoxMat = new THREE.MeshStandardMaterial({ color: 0x240206, roughness: 0.3, metalness: 0.7 })
        const marquee = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 0.3), marqueeBoxMat)
        marquee.position.set(0, 2.1, 0.2)
        marquee.rotation.x = -0.15
        this.machineGroup.add(marquee)

        const defaultMarqueeTex = this.createMarqueeTexture("SLOT MACHINE")
        this.marqueeMat = new THREE.MeshBasicMaterial({ map: defaultMarqueeTex })
        const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.72), this.marqueeMat)
        signPlane.position.set(0, 0, 0.152)
        marquee.add(signPlane)

        const marqueeGlass = new THREE.Mesh(
            new THREE.PlaneGeometry(3.3, 0.72),
            new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.25 })
        )
        marqueeGlass.position.set(0, 0, 0.155)
        marquee.add(marqueeGlass)

        const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.05), darkMetalMat)
        coinSlot.position.set(1.1, 1.5, 0.82)
        this.machineGroup.add(coinSlot)

        const marqueeTrimTop = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.08, 0.35), goldTrimMat)
        marqueeTrimTop.position.set(0, 2.5, 0.12)
        marqueeTrimTop.rotation.x = -0.15
        this.machineGroup.add(marqueeTrimTop)

        const bulbGeo = new THREE.SphereGeometry(0.04, 16, 16)
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffea00 })
        for (let i = -1.5; i <= 1.5; i += 0.3) {
            const topBulb = new THREE.Mesh(bulbGeo, bulbMat)
            topBulb.position.set(i, 2.55, 0.05)
            this.machineGroup.add(topBulb)
        }

        const stripeGeo = new THREE.BoxGeometry(0.08, 2.2, 0.02)
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff3344, metalness: 0.8, roughness: 0.2 })
        for (let xSide of [-1.72, 1.72]) {
            const stripe = new THREE.Mesh(stripeGeo, stripeMat)
            stripe.position.set(xSide, 0.1, 0.91)
            this.machineGroup.add(stripe)
        }

        const speakerGroup = new THREE.Group()
        speakerGroup.position.set(0, 1.35, 0.55)
        speakerGroup.rotation.x = -0.15
        for (let i = -5; i <= 5; i++) {
            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.02), darkMetalMat)
            slot.position.set(i * 0.22, 0, 0)
            speakerGroup.add(slot)
        }
        this.machineGroup.add(speakerGroup)

        // Bezel & Window
        const bezel = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.3, 0.2), goldTrimMat)
        bezel.position.set(0, 0.3, 0.72)
        this.machineGroup.add(bezel)

        const glowFrameMatBase = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.0 })
        this.glowFrameMat = glowFrameMatBase
        const glowFrame = new THREE.Mesh(new THREE.BoxGeometry(3.45, 1.45, 0.15), this.glowFrameMat)
        glowFrame.position.set(0, 0.3, 0.70)
        this.machineGroup.add(glowFrame)

        const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x050203 }))
        windowMesh.position.set(0, 0.3, 0.78)
        this.machineGroup.add(windowMesh)

        const glassOverlayMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
        const glassOverlay = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.0), glassOverlayMat)
        glassOverlay.position.set(0, 0.3, 0.84)
        this.machineGroup.add(glassOverlay)

        const pointerGeo = new THREE.ConeGeometry(0.08, 0.18, 4)
        pointerGeo.rotateX(Math.PI / 2)
        const leftPointer = new THREE.Mesh(pointerGeo, goldTrimMat)
        leftPointer.position.set(-1.62, 0.3, 0.82)
        this.machineGroup.add(leftPointer)

        const rightPointer = new THREE.Mesh(pointerGeo, goldTrimMat)
        rightPointer.rotation.y = Math.PI
        rightPointer.position.set(1.62, 0.3, 0.82)
        this.machineGroup.add(rightPointer)

        // Reels Setup
        const numReels = 3
        const numSymbols = this.symbolsList.length
        for (let i = 0; i < numReels; i++) {
            const reelGroup = new THREE.Group()
            reelGroup.position.set((i - 1) * 1.02, 0.3, 0.75)
            const angleStep = (Math.PI * 2) / numSymbols

            for (let j = 0; j < numSymbols; j++) {
                const planeMat = new THREE.MeshBasicMaterial({ map: this.symbolTextures[j], side: THREE.DoubleSide })
                const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), planeMat)
                const radius = 0.7
                const theta = j * angleStep
                face.position.y = Math.sin(theta) * radius
                face.position.z = Math.cos(theta) * radius
                face.rotation.x = -theta
                reelGroup.add(face)
            }
            this.machineGroup.add(reelGroup)
            this.reels.push({ group: reelGroup, currentIdx: 0 })

            if (i < numReels - 1) {
                const divider = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 1.4), darkMetalMat)
                divider.position.set((i - 1) * 1.02 + 0.51, 0.3, 0.75)
                this.machineGroup.add(divider)
            }
        }

        // Control Panel Deck
        const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.2), cabinetMat)
        deck.position.set(0, -0.9, 0.6)
        deck.castShadow = true
        this.machineGroup.add(deck)

        const deckTrim = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.1, 1.25), goldTrimMat)
        deckTrim.position.set(0, -0.85, 0.6)
        this.machineGroup.add(deckTrim)

        // Coin Return Tray
        const trayGroup = new THREE.Group()
        trayGroup.position.set(1.1, -1.3, 0.85)
        this.machineGroup.add(trayGroup)

        const trayRecess = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.3), darkMetalMat)
        trayGroup.add(trayRecess)
        const trayLip = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.32), chromeMat)
        trayLip.position.set(0, 0.2, 0)
        trayGroup.add(trayLip)

        // Handle / Arm Assembly
        const handleGroup = new THREE.Group()
        handleGroup.position.set(1.95, 0.2, 0.4)
        this.machineGroup.add(handleGroup)

        const mountPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32), chromeMat)
        mountPlate.rotation.z = Math.PI / 2
        mountPlate.position.set(0.04, 0, 0)
        handleGroup.add(mountPlate)

        this.armPivot = new THREE.Group()
        this.armPivot.position.set(0.08, 0, 0)
        handleGroup.add(this.armPivot)

        const upperRod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 16), chromeMat)
        upperRod.position.set(0, 0.35, 0)
        this.armPivot.add(upperRod)

        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), chromeMat)
        elbow.position.set(0, 0.7, 0)
        this.armPivot.add(elbow)

        const lowerRod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 16), chromeMat)
        lowerRod.rotation.z = -Math.PI / 6
        lowerRod.position.set(0.14, 0.95, 0)
        this.armPivot.add(lowerRod)

        const knobMat = new THREE.MeshPhysicalMaterial({ color: 0xff0033, roughness: 0.1, transmission: 0.5, transparent: true, opacity: 0.9 })
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 32), knobMat)
        knob.position.set(0.24, 1.18, 0)
        this.armPivot.add(knob)
    }

    setupListeners() {
        window.addEventListener('resize', this.resizeHandler)
        this.addEventListener('click', () => this.spinReels())
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    spinReels() {
        if (this.isSpinning) return
        this.isSpinning = true

        gsap.to(this.armPivot.rotation, {
            x: Math.PI * 0.75,
            duration: 0.15,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut",
            onComplete: () => { this.armPivot.rotation.x = 0 }
        })

        const angleStep = (Math.PI * 2) / this.symbolsList.length

        this.reels.forEach((reel, index) => {
            const targetIdx = Math.floor(Math.random() * this.symbolsList.length)
            const extraSpins = 4 + index * 2
            const targetAngle = reel.group.rotation.x - ((Math.PI * 2 * extraSpins) + (targetIdx * angleStep - (reel.currentIdx * angleStep)))

            gsap.to(reel.group.rotation, {
                x: targetAngle,
                duration: 1.2 + index * 0.4,
                ease: "back.out(1.2)",
                onComplete: () => {
                    reel.currentIdx = targetIdx
                    reel.group.rotation.x = -(targetIdx * angleStep)

                    if (index === this.reels.length - 1) {
                        this.isSpinning = false
                        if (this.reels[0].currentIdx === this.reels[1].currentIdx && this.reels[1].currentIdx === this.reels[2].currentIdx) {
                            this.triggerJackpotAnimation()
                        }
                    }
                }
            })
        })
    }

    triggerJackpotAnimation() {
        const jackpotTex = this.createMarqueeTexture("JACKPOT")
        this.marqueeMat.map = jackpotTex
        this.marqueeMat.needsUpdate = true

        gsap.timeline()
            .to(this.machineGroup.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.3, yoyo: true, repeat: 15, ease: "power1.inOut" })
            .to(this.machineGroup.scale, {
                x: 1, y: 1, z: 1, duration: 0.5, onComplete: () => {
                    this.marqueeMat.map = this.createMarqueeTexture("SLOT MACHINE")
                    this.marqueeMat.needsUpdate = true
                }
            })

        gsap.to(this.glowFrameMat, { opacity: 0.85, duration: 0.3, yoyo: true, repeat: 15, ease: "power1.inOut" })
        gsap.to(this.pointLight, { intensity: 6, duration: 0.4, yoyo: true, repeat: 11 })

        // Screen flash effect
        const flash = document.createElement('div')
        flash.style.position = 'fixed'
        flash.style.top = '0'
        flash.style.left = '0'
        flash.style.width = '100vw'
        flash.style.height = '100vh'
        flash.style.background = 'radial-gradient(circle, rgba(255,234,0,0.8) 0%, rgba(255,23,68,0) 70%)'
        flash.style.pointerEvents = 'none'
        flash.style.zIndex = '999'
        document.body.appendChild(flash)

        gsap.to(flash, {
            opacity: 0,
            duration: 5.0,
            onComplete: () => flash.remove()
        })

        // Confetti explosion
        for (let i = 0; i < 150; i++) {
            const confetti = document.createElement('div')
            confetti.className = 'confetti'
            confetti.style.left = Math.random() * window.innerWidth + 'px'
            confetti.style.backgroundColor = ['#ffd700', '#ff1744', '#00e676', '#00b0ff', '#ffea00'][Math.floor(Math.random() * 5)]
            confetti.style.width = (Math.random() * 8 + 6) + 'px'
            confetti.style.height = (Math.random() * 8 + 6) + 'px'
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%'
            document.body.appendChild(confetti)

            gsap.to(confetti, {
                y: window.innerHeight + 50,
                x: (Math.random() - 0.5) * 400,
                rotation: Math.random() * 1080,
                duration: Math.random() * 3.5 + 1.5,
                ease: "power1.out",
                onComplete: () => confetti.remove()
            })
        }
    }

    tick() {
        this.animId = requestAnimationFrame(() => this.tick())

        const positions = this.particleGeo.attributes.position.array as Float32Array
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += 0.003
            if (positions[i] > 6) positions[i] = -6
        }
        this.particleGeo.attributes.position.needsUpdate = true

        this.renderer.render(this.scene, this.camera)
    }
}

customElements.define('slot-machine-app', SlotMachineApp)
