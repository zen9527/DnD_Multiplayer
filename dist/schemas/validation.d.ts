import { z } from 'zod';
export declare const createGameSchema: z.ZodObject<{
    gameName: z.ZodString;
    maxPlayers: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    maxPlayers: number;
    gameName: string;
}, {
    maxPlayers: number;
    gameName: string;
}>;
export declare const joinGameSchema: z.ZodObject<{
    gameId: z.ZodString;
    playerName: z.ZodString;
    characterName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    gameId: string;
    playerName: string;
    characterName: string;
}, {
    gameId: string;
    playerName: string;
    characterName: string;
}>;
export declare const chatMessageSchema: z.ZodObject<{
    content: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<["text", "roll", "npc", "event"]>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    type?: "text" | "roll" | "npc" | "event" | undefined;
}, {
    content: string;
    type?: "text" | "roll" | "npc" | "event" | undefined;
}>;
export declare const diceRollSchema: z.ZodObject<{
    diceType: z.ZodEffects<z.ZodEnum<["4", "6", "8", "10", "12", "20"]>, number, "4" | "6" | "8" | "10" | "12" | "20">;
    count: z.ZodNumber;
    modifier: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    diceType: number;
    count: number;
    modifier?: number | undefined;
}, {
    diceType: "4" | "6" | "8" | "10" | "12" | "20";
    count: number;
    modifier?: number | undefined;
}>;
export declare const npcSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["friendly", "neutral", "hostile"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: "friendly" | "neutral" | "hostile";
    description?: string | undefined;
}, {
    name: string;
    role: "friendly" | "neutral" | "hostile";
    description?: string | undefined;
}>;
export declare const eventSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description?: string | undefined;
}, {
    title: string;
    description?: string | undefined;
}>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type DiceRollInput = z.infer<typeof diceRollSchema>;
export type NPCCreateInput = z.infer<typeof npcSchema>;
export type EventCreateInput = z.infer<typeof eventSchema>;
/**
 * Safely validate data against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns { success: boolean, data?: T, error?: string }
 */
export declare function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};
//# sourceMappingURL=validation.d.ts.map