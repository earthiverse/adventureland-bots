import { MapName, MonsterName } from "./adventureland";

export type TargetPriorityList = {
    [T in MonsterName]?: TargetPriorityInfo;
};

export interface TargetPriorityInfo {
    /**
     * The higher the priority, the more likely we are to target it.
     */
    priority: number;
    /**
     * When smart moving past the monster, if true, we won't attack the monster.
     */
    holdAttack?: boolean;
    /**
     * When smart moving to this monster, we won't move after we reach the destination.
     */
    holdPosition?: boolean;
    /**
     * When smart moving to this monster, if true, we will stop when we see one within attacking range.
     */
    stopOnSight?: boolean;
    /**
     * The map where we will move to find this monster.
     */
    map?: MapName;
    /**
     *  The x position where we will move to find this monster.
     */
    x?: number;
    /**
     *  The y position where we will move to find this monster.
     */
    y?: number;
}