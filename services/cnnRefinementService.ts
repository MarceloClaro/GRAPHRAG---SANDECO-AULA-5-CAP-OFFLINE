
import { EmbeddingVector, CNNHyperParameters, TrainingMetrics } from '../types';

// --- Math Helpers for Vector Operations ---

const add = (v1: number[], v2: number[]) => v1.map((val, i) => val + v2[i]);
const sub = (v1: number[], v2: number[]) => v1.map((val, i) => val - v2[i]);
const mult = (v: number[], scalar: number) => v.map(val => val * scalar);
const dot = (v1: number[], v2: number[]) => v1.reduce((acc, val, i) => acc + val * v2[i], 0);
const norm = (v: number[]) => Math.sqrt(dot(v, v));
const normalize = (v: number[]) => {
    const n = norm(v);
    return n === 0 ? v : mult(v, 1 / n);
};

// Euclidean Distance Squared (mais eficiente para cálculo de gradiente)
const distSq = (v1: number[], v2: number[]) => {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        const d = v1[i] - v2[i];
        sum += d * d;
    }
    return sum;
};

/**
 * Simula o treinamento de uma CNN 1D aplicando Triplet Loss nos embeddings existentes.
 * Implementa Cross-Validation 80/20.
 */
export const trainCNNWithTripletLoss = async (
    embeddings: EmbeddingVector[],
    params: CNNHyperParameters,
    onEpochComplete: (metrics: TrainingMetrics, updatedEmbeddings: EmbeddingVector[]) => void
) => {
    // 1. Deep copy vectors
    let currentEmbeddings = embeddings.map(e => ({ ...e, vector: [...e.vector] }));
    const dim = currentEmbeddings[0].vector.length;

    // AdamW Parameters
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;
    const weightDecay = 0.01;

    // Adam State
    const optimizerState: Record<string, { m: number[], v: number[] }> = {};
    currentEmbeddings.forEach(e => {
        optimizerState[e.id] = {
            m: new Array(dim).fill(0),
            v: new Array(dim).fill(0)
        };
    });

    let learningRate = params.learningRate;

    // --- Data Splitting (80/20) ---
    const allIndices = Array.from({ length: currentEmbeddings.length }, (_, i) => i);
    // Shuffle indices para garantir aleatoriedade no split
    const shuffledIndices = allIndices.sort(() => Math.random() - 0.5);
    
    const splitIndex = Math.floor(currentEmbeddings.length * 0.8);
    const trainIndices = shuffledIndices.slice(0, splitIndex);
    const valIndices = shuffledIndices.slice(splitIndex);

    // Sets para lookup rápido durante mineração
    const trainSet = new Set(trainIndices);
    const valSet = new Set(valIndices);

    // --- Helper function to process a batch (Train or Validation) ---
    const processBatch = (indices: number[], isTraining: boolean): { loss: number, count: number } => {
        let batchLoss = 0;
        let batchTriplets = 0;

        // Valid Index Checker: garante que P e N pertençam ao mesmo set (Treino ou Validação) do Anchor
        const isValidCandidate = (idx: number) => isTraining ? trainSet.has(idx) : valSet.has(idx);

        for (const i of indices) {
            const anchor = currentEmbeddings[i];
            
            // --- Mining Strategy (Restricted to current set) ---
            let positiveIdx = -1;
            let negativeIdx = -1;

            // Find Positive in same set
            const potentialPositives = indices.filter(idx => idx !== i && isValidCandidate(idx) && (
                currentEmbeddings[idx].entityType === anchor.entityType ||
                hasKeywordOverlap(anchor, currentEmbeddings[idx])
            ));

            if (potentialPositives.length > 0) {
                positiveIdx = potentialPositives[Math.floor(Math.random() * potentialPositives.length)];
            }

            // Find Negative in same set
            const potentialNegatives = indices.filter(idx => idx !== i && idx !== positiveIdx && isValidCandidate(idx) && 
                currentEmbeddings[idx].entityType !== anchor.entityType
            );

            if (potentialNegatives.length > 0) {
                if (params.miningStrategy === 'random') {
                    negativeIdx = potentialNegatives[Math.floor(Math.random() * potentialNegatives.length)];
                } else {
                    // Hard/Semi-hard Mining logic
                    const distAP = positiveIdx !== -1 ? distSq(anchor.vector, currentEmbeddings[positiveIdx].vector) : 0;
                    
                    const sortedNegatives = potentialNegatives
                        .map(idx => ({ idx, dist: distSq(anchor.vector, currentEmbeddings[idx].vector) }))
                        .sort((a, b) => a.dist - b.dist);

                    if (params.miningStrategy === 'hard') {
                        negativeIdx = sortedNegatives[0].idx;
                    } else {
                        const semiHard = sortedNegatives.find(n => n.dist > distAP && n.dist < distAP + params.margin);
                        negativeIdx = semiHard ? semiHard.idx : sortedNegatives[0].idx;
                    }
                }
            }

            if (positiveIdx === -1 || negativeIdx === -1) continue;

            const positive = currentEmbeddings[positiveIdx];
            const negative = currentEmbeddings[negativeIdx];

            // --- Loss Calculation ---
            const distPos = Math.sqrt(distSq(anchor.vector, positive.vector));
            const distNeg = Math.sqrt(distSq(anchor.vector, negative.vector));
            
            const loss = Math.max(distPos - distNeg + params.margin, 0);

            if (loss > 0) {
                batchLoss += loss;
                batchTriplets++;

                // --- Optimization Step (ONLY FOR TRAINING) ---
                if (isTraining) {
                    const gradA_P = mult(sub(anchor.vector, positive.vector), 1 / (distPos + epsilon));
                    const gradA_N = mult(sub(anchor.vector, negative.vector), 1 / (distNeg + epsilon));
                    const gradA = sub(gradA_P, gradA_N);
                    const gradP = mult(gradA_P, -1);
                    const gradN = gradA_N;

                    applyAdamW(anchor.id, anchor.vector, gradA, learningRate, 1, optimizerState, weightDecay, beta1, beta2, epsilon);
                    applyAdamW(positive.id, positive.vector, gradP, learningRate, 1, optimizerState, weightDecay, beta1, beta2, epsilon);
                    applyAdamW(negative.id, negative.vector, gradN, learningRate, 1, optimizerState, weightDecay, beta1, beta2, epsilon);
                    
                    anchor.vector = normalize(anchor.vector);
                    positive.vector = normalize(positive.vector);
                    negative.vector = normalize(negative.vector);
                }
            }
        }
        return { loss: batchLoss, count: batchTriplets };
    };

    // --- Training Loop ---
    for (let epoch = 1; epoch <= params.epochs; epoch++) {
        
        // 1. Training Phase
        // Shuffle train indices each epoch for better SGD behavior
        const epochTrainIndices = [...trainIndices].sort(() => Math.random() - 0.5);
        const trainResults = processBatch(epochTrainIndices, true);

        // 2. Validation Phase (No Shuffle needed, no updates)
        const valResults = processBatch(valIndices, false);

        // --- Metrics Calculation ---
        const avgTrainLoss = trainResults.count > 0 ? trainResults.loss / trainResults.count : 0;
        const avgValLoss = valResults.count > 0 ? valResults.loss / valResults.count : 0;

        // Update Learning Rate
        learningRate = params.learningRate * (1 - (epoch / params.epochs));

        await new Promise(r => setTimeout(r, 50)); // UI friendly delay
        
        onEpochComplete({
            currentEpoch: epoch,
            trainLoss: avgTrainLoss,
            valLoss: avgValLoss,
            trainTripletCount: trainResults.count,
            valTripletCount: valResults.count
        }, currentEmbeddings);
    }
};

// Helper: AdamW Update
function applyAdamW(
    id: string, 
    params: number[], 
    grads: number[], 
    lr: number, 
    t: number, 
    state: Record<string, { m: number[], v: number[] }>,
    weightDecay: number,
    beta1: number,
    beta2: number,
    epsilon: number
) {
    const s = state[id];
    
    for (let i = 0; i < params.length; i++) {
        params[i] = params[i] * (1 - lr * weightDecay);
        s.m[i] = beta1 * s.m[i] + (1 - beta1) * grads[i];
        s.v[i] = beta2 * s.v[i] + (1 - beta2) * (grads[i] * grads[i]);
        const mHat = s.m[i] / (1 - Math.pow(beta1, t));
        const vHat = s.v[i] / (1 - Math.pow(beta2, t));
        params[i] = params[i] - lr * (mHat / (Math.sqrt(vHat) + epsilon));
    }
}

function hasKeywordOverlap(a: EmbeddingVector, b: EmbeddingVector): boolean {
    if (!a.keywords || !b.keywords) return false;
    return a.keywords.some(k => b.keywords?.includes(k));
}
