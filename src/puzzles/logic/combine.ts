import type { ItemId } from '../../game/data/types';

/** The only combination in the game (PUZZLE_SPECIFICATIONS.md P-07): ribbon + ginger medal → keeper medal. */
const RECIPES: readonly { a: ItemId; b: ItemId; result: ItemId }[] = [
    { a: 'ITEM_RIBBON', b: 'ITEM_GINGER_MEDAL', result: 'ITEM_KEEPER_MEDAL' },
];

export function combineItems(a: ItemId, b: ItemId): ItemId | null {
    const r = RECIPES.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    return r ? r.result : null;
}
