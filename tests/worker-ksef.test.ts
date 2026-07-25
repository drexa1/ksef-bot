import { describe, it, expect } from "vitest";
import {post} from "../src/vectors/cloudflare";

import speaker1Sample1 from "./testresources/speaker1/mfcc/sample1.json";
import speaker1Sample2 from "./testresources/speaker1/mfcc/sample2.json";
import speaker1Sample3 from "./testresources/speaker1/mfcc/sample3.json";

import speaker2Sample1 from "./testresources/speaker2/mfcc/sample1.json";
import speaker2Sample2 from "./testresources/speaker2/mfcc/sample2.json";
import speaker2Sample3 from "./testresources/speaker2/mfcc/sample3.json";

const toPostBody = (jsonSample: { mfcc: number[] }) => {
    return {
        mfcc: new Float32Array(jsonSample.mfcc)
    };
};

describe("Test kv endpoint", () => {

    it.skip("Speaker1 samples cluster together", async () => {
        const post1 = await post(toPostBody(speaker1Sample1));
        const post2 = await post(toPostBody(speaker1Sample2));
        const post3 = await post(toPostBody(speaker1Sample3));
        console.log("post1: ", post1)
        console.log("post2: ", post2)
        console.log("post3: ", post3)
        // After the first submission, the following should find relation
        const allMatch = ("matches" in post2 && post2.matches?.length > 0) && ("matches" in post3 && post3.matches?.length > 0);
        expect(allMatch).toBe(true);
    }, 5000);

    it.skip("Speaker2 samples cluster together", async () => {
        const post1 = await post(toPostBody(speaker2Sample1));
        const post2 = await post(toPostBody(speaker2Sample2));
        const post3 = await post(toPostBody(speaker2Sample3));
        console.log("post1: ", post1)
        console.log("post2: ", post2)
        console.log("post3: ", post3)
        // After the first submission, the following should find relation
        const allMatch = ("matches" in post2 && post2.matches?.length > 0) && ("matches" in post3 && post3.matches?.length > 0);
        expect(allMatch).toBe(true);
    }, 5000);

    it.skip("Speaker1 sample does not match speaker2 sample", async () => {
        const post1 = await post(toPostBody(speaker1Sample1));
        const post2 = await post(toPostBody(speaker2Sample1));
        console.log("post1: ", post1)
        console.log("post2: ", post2)
        const topMatchId1 = "matches" in post1 && post1.matches?.length > 0 ? post1.matches[0].id : null;
        const topMatchId2 = "matches" in post2 && post2.matches?.length > 0 ? post2.matches[0].id : null;

        // If both submissions found a match
        if (topMatchId1 && topMatchId2) {
            // check that they matched against different sources
            expect(topMatchId1).not.toBe(topMatchId2);
        } else {
            // if any didn't find matches, they don't cross-match
            console.log(`Speaker1 top match: ${topMatchId1}, speaker2 top match: ${topMatchId2}`);
        }
    }, 5000);
});

describe("Test cosine similarity", () => {

    const SIMILARITY_THRESHOLD = 0.60;

    it("Speaker1 samples cluster together", () => {
        const sim1to2 = calculateCosineSimilarity(speaker1Sample1.mfcc, speaker1Sample2.mfcc);
        const sim1to3 = calculateCosineSimilarity(speaker1Sample1.mfcc, speaker1Sample3.mfcc);
        console.log(`Sample#1 vs sample#2 similarity: ${sim1to2.toFixed(2)}`);
        console.log(`Sample#1 vs sample#3 similarity: ${sim1to3.toFixed(2)}`);
        expect(sim1to2).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
        expect(sim1to3).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    });

    it("Speaker2 samples cluster together", () => {
        const sim1to2 = calculateCosineSimilarity(speaker2Sample1.mfcc, speaker2Sample2.mfcc);
        const sim1to3 = calculateCosineSimilarity(speaker2Sample1.mfcc, speaker2Sample3.mfcc);
        console.log(`Sample#1 vs sample#2 similarity: ${sim1to2.toFixed(2)}`);
        console.log(`Sample#1 vs sample#3 similarity: ${sim1to3.toFixed(2)}`);
        expect(sim1to2).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
        expect(sim1to3).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    });

    it("Speaker1 sample does not match speaker2 sample", () => {
        const vector1 = speaker1Sample1.mfcc;
        const vector2 = speaker2Sample1.mfcc;
        const similarity = calculateCosineSimilarity(vector1, vector2);
        console.log(`Cosine similarity between speaker#1 vs speaker#2: ${similarity.toFixed(2)}`);
        expect(similarity).toBeLessThan(SIMILARITY_THRESHOLD);
    });

    function calculateCosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
        const magnitude = (arr: number[]) => Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0));
        const arrA = Array.from(a);
        const arrB = Array.from(b);
        const magA = magnitude(arrA);
        const magB = magnitude(arrB);
        if (magA === 0 || magB === 0) return 0;
        const dotProduct = arrA.reduce((sum, val, i) => sum + val * arrB[i], 0);
        return dotProduct / (magA * magB);
    }
});