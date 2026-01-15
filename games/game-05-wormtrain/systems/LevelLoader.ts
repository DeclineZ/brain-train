import { LevelData, Node, Edge, JunctionData, TrapConfig } from '../types/level';
import { LEVELS } from '../levels';

export class LevelLoader {
    constructor() { }

    public loadLevel(levelId: string | number): LevelData {
        const level = LEVELS.find(l => l.levelId === levelId);
        if (!level) {
            throw new Error(`Level ${levelId} not found`);
        }

        this.validateLevel(level);
        return JSON.parse(JSON.stringify(level)); // Return deep copy
    }

    private validateLevel(level: LevelData) {
        const nodeMap = new Map<string, Node>();
        const edgeMap = new Map<string, Edge>();

        // 1. Validate Nodes
        level.nodes.forEach(node => {
            if (nodeMap.has(node.id)) {
                throw new Error(`Duplicate node ID: ${node.id}`);
            }
            nodeMap.set(node.id, node);

            if (node.type === 'HOLE' && !node.color) {
                throw new Error(`Hole node ${node.id} is missing color`);
            }
        });

        // 2. Validate Edges
        level.edges.forEach(edge => {
            if (edgeMap.has(edge.id)) {
                throw new Error(`Duplicate edge ID: ${edge.id}`);
            }
            edgeMap.set(edge.id, edge);

            if (!nodeMap.has(edge.from)) {
                throw new Error(`Edge ${edge.id} references missing 'from' node: ${edge.from}`);
            }
            if (!nodeMap.has(edge.to)) {
                throw new Error(`Edge ${edge.id} references missing 'to' node: ${edge.to}`);
            }

            // Check width consistency with rules if strict mode was needed, 
            // but strictly we just need to ensure values are valid Enum which TS handles mostly.
        });

        // 3. Validate Junctions
        level.junctions.forEach(junction => {
            const node = nodeMap.get(junction.id);
            if (!node) {
                throw new Error(`Junction config references missing node ID: ${junction.id}`);
            }
            if (node.type !== 'JUNCTION') {
                throw new Error(`Junction config has node ID ${junction.id} but type is ${node.type}`);
            }

            if (junction.outEdges.length < 2) {
                throw new Error(`Junction ${junction.id} must have at least 2 outEdges`);
            }

            junction.outEdges.forEach(edgeId => {
                const edge = edgeMap.get(edgeId);
                if (!edge) {
                    throw new Error(`Junction ${junction.id} references missing edge: ${edgeId}`);
                }
                if (edge.from !== junction.id) {
                    throw new Error(`Junction ${junction.id} specifies outEdge ${edgeId} but that edge starts at ${edge.from}`);
                }
            });
        });

        // 4. Validate Traps
        level.traps.forEach(trap => {
            // Validation: Trap nodes must not conflict with Holes (except Collapsing Holes)
            if (trap.nodeId) {
                const node = nodeMap.get(trap.nodeId);
                if (!node) {
                    throw new Error(`Trap ${trap.id} references missing node: ${trap.nodeId}`);
                }
                if (node.type === 'HOLE' && trap.type !== 'COLLAPSING_HOLE') {
                    throw new Error(`Trap ${trap.id} (type ${trap.type}) cannot be placed on HOLE node ${trap.nodeId}`);
                }
            }
        });

        console.log(`Level ${level.levelId} validated successfully.`);
    }
}
