import Phaser from 'phaser';
import { LevelData, Node, Edge, Point } from '../types/level';
import GameScene from '../GameScene';

export class GraphSystem {
    private scene: GameScene;
    private nodes: Map<string, Node> = new Map();
    private edges: Map<string, Edge> = new Map();
    private outEdgesMap: Map<string, string[]> = new Map();

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public init(levelData: LevelData) {
        this.nodes.clear();
        this.edges.clear();
        this.outEdgesMap.clear();

        levelData.nodes.forEach(node => {
            this.nodes.set(node.id, node);
            this.outEdgesMap.set(node.id, []);
        });

        levelData.edges.forEach(edge => {
            this.edges.set(edge.id, edge);
            const out = this.outEdgesMap.get(edge.from);
            if (out) {
                out.push(edge.id);
            }
        });
    }

    public getNode(nodeId: string): Node | undefined {
        return this.nodes.get(nodeId);
    }

    public getEdge(edgeId: string): Edge | undefined {
        return this.edges.get(edgeId);
    }

    public getOutEdges(nodeId: string): string[] {
        return this.outEdgesMap.get(nodeId) || [];
    }

    /**
     * Helper: Get the next edge ID from a node given a chosen index.
     * Useful for Junctions (returns specific outEdge) or Merges (returns the single outEdge).
     */
    public getNextEdge(nodeId: string, activeIndex: number = 0): Edge | undefined {
        const outs = this.getOutEdges(nodeId);
        if (outs.length === 0) return undefined;

        // Safety clamp (though Junction logic should handle this)
        const index = activeIndex % outs.length;
        const edgeId = outs[index];
        return this.edges.get(edgeId);
    }

    /**
     * Helper: Get the polyline (points) of an edge.
     * Takes into account if we need to include start/end node positions (usually yes for path following).
     */
    public getEdgePolyline(edgeId: string): Point[] {
        const edge = this.edges.get(edgeId);
        if (!edge) return [];

        // In this design, edge.path is the source of truth for geometry
        // We might want to ensure it includes the start and end point for smooth transitions
        // depending on how data is authored. Assuming `path` is complete for now.
        return edge.path;
    }
}
