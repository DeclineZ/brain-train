import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormGameConstants as WormGameConfig } from '../config';
import { Edge, LevelData, Node } from '../types/level';

export class GraphVisual {
    private scene: GameScene;
    private graphics: Phaser.GameObjects.Graphics;
    private nodeSprites: Phaser.GameObjects.Container;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(WormGameConfig.DEPTH.PATH);
        this.nodeSprites = this.scene.add.container(0, 0);
        this.nodeSprites.setDepth(WormGameConfig.DEPTH.HOLE);
    }

    public init(levelData: LevelData) {
        this.drawGraph(levelData);
    }

    private drawGraph(levelData: LevelData) {
        this.graphics.clear();
        this.nodeSprites.removeAll(true);

        // Configurable styles
        const style = levelData.tunnelStyle || {
            innerColor: 0x2d2d2d,
            outerColor: 0x4a4a4a,
            innerAlpha: 1,
            outerAlpha: 1,
            widthMultiplier: 1
        };

        // 1. Draw Outer Layer (Border/Depth)
        levelData.edges.forEach(edge => {
            const baseWidth = edge.widthClass === 'narrow' ? WormGameConfig.PATH_WIDTH_NARROW : WormGameConfig.PATH_WIDTH_NORMAL;
            this.graphics.lineStyle(baseWidth * 1.4 * (style.widthMultiplier || 1), style.outerColor, style.outerAlpha);
            this.drawEdgePath(edge);
        });

        // 2. Draw Inner Layer (Tunnel Floor)
        levelData.edges.forEach(edge => {
            const baseWidth = edge.widthClass === 'narrow' ? WormGameConfig.PATH_WIDTH_NARROW : WormGameConfig.PATH_WIDTH_NORMAL;
            this.graphics.lineStyle(baseWidth * (style.widthMultiplier || 1), style.innerColor, style.innerAlpha);
            this.drawEdgePath(edge);
        });

        // 3. Draw Nodes (Stylized)
        this.drawNodes(levelData.nodes, style);
    }

    private drawEdgePath(edge: Edge) {
        if (!edge.path || edge.path.length === 0) return;

        this.graphics.beginPath();
        this.graphics.moveTo(edge.path[0].x, edge.path[0].y);
        for (let i = 1; i < edge.path.length; i++) {
            this.graphics.lineTo(edge.path[i].x, edge.path[i].y);
        }
        this.graphics.strokePath();
    }

    private drawNodes(nodes: Node[], style: any) {
        nodes.forEach((node: Node) => {
            if (node.type === 'JUNCTION' || node.type === 'MERGE') {
                // Chunky junction circle - larger for mobile
                this.graphics.fillStyle(style.outerColor, 1);
                this.graphics.fillCircle(node.x, node.y, WormGameConfig.PATH_WIDTH_NORMAL * 1.2);
                this.graphics.fillStyle(style.innerColor, 1);
                this.graphics.fillCircle(node.x, node.y, WormGameConfig.PATH_WIDTH_NORMAL * 0.9);
            } else if (node.type === 'HOLE') {
                // Determine color-specific sprite key
                const colorLower = node.color?.toLowerCase() || '';
                let holeTextureKey = 'hole'; // Default fallback

                // Map colors to specific sprites
                if (colorLower === '#ff914d' || colorLower.includes('ff914d')) {
                    holeTextureKey = 'hole_orange';
                } else if (colorLower === '#5170ff' || colorLower.includes('5170ff')) {
                    holeTextureKey = 'hole_blue';
                } else if (colorLower === '#58cc02' || colorLower.includes('58cc02')) {
                    holeTextureKey = 'hole_green';
                } else if (colorLower === '#ffd700' || colorLower.includes('ffd700')) {
                    holeTextureKey = 'hole_yellow';
                } else if (colorLower === '#e91e63' || colorLower.includes('e91e63')) {
                    holeTextureKey = 'hole_pink';
                } else if (colorLower === '#9c27b0' || colorLower.includes('9c27b0')) {
                    holeTextureKey = 'hole_purple';
                }

                // Size multiplier based on hole size (S=smaller, M=normal)
                const sizeMultiplier = node.size === 'S' ? 6 : 8;

                // Use color-specific hole sprite if available
                if (this.scene.textures.exists(holeTextureKey)) {
                    const holeSprite = this.scene.add.image(node.x, node.y, holeTextureKey);
                    const targetSize = WormGameConfig.PATH_WIDTH_NORMAL * sizeMultiplier;
                    const textureWidth = holeSprite.width || 512;
                    holeSprite.setScale(targetSize / textureWidth);
                    this.nodeSprites.add(holeSprite);
                } else if (this.scene.textures.exists('hole')) {
                    // Fallback to generic hole with tint
                    const holeSprite = this.scene.add.image(node.x, node.y, 'hole');
                    const targetSize = WormGameConfig.PATH_WIDTH_NORMAL * sizeMultiplier;
                    const textureWidth = holeSprite.width || 512;
                    holeSprite.setScale(targetSize / textureWidth);
                    const color = parseInt(node.color!.replace('#', '0x'));
                    holeSprite.setTint(color);
                    this.nodeSprites.add(holeSprite);
                } else {
                    // Fallback circle - smaller for S, larger for M
                    const color = parseInt(node.color!.replace('#', '0x'));
                    const radiusMultiplier = node.size === 'S' ? 2.2 : 3;
                    this.graphics.fillStyle(color, 1);
                    this.graphics.fillCircle(node.x, node.y, WormGameConfig.PATH_WIDTH_NORMAL * radiusMultiplier);
                    this.graphics.fillStyle(0x000000, 0.5);
                    this.graphics.fillCircle(node.x, node.y, WormGameConfig.PATH_WIDTH_NORMAL * 0.6);
                }
            } else if (node.type === 'SPAWN') {
                // Use spawn mound sprite if loaded, otherwise fallback
                if (this.scene.textures.exists('spawn')) {
                    const spawnSprite = this.scene.add.image(node.x, node.y, 'spawn');
                    // Scale to be larger than tunnel width (~192px diameter)
                    const targetSize = WormGameConfig.PATH_WIDTH_NORMAL * 8;
                    const textureWidth = spawnSprite.width || 512;
                    spawnSprite.setScale(targetSize / textureWidth);
                    this.nodeSprites.add(spawnSprite);
                } else {
                    // Fallback: dirt mound circle
                    this.graphics.fillStyle(0x8B4513, 0.8);
                    this.graphics.fillCircle(node.x, node.y, WormGameConfig.PATH_WIDTH_NORMAL * 2.5);
                    this.graphics.fillStyle(0x654321, 1);
                    this.graphics.fillCircle(node.x, node.y, WormGameConfig.PATH_WIDTH_NORMAL * 0.4);
                }
            }
        });
    }
}
