export const INGREDIENTS = {
    корж: ['Ваниль', 'Шоколад', 'Пряник'],
    начинка: ['Клубника', 'Лимон', 'Черника'],
    глазурь: ['Сливочная', 'Розовая', 'Шоколадная'],
    украшение: ['Вишня', 'Звезда', 'Малина'],
} as const;

type Layer = keyof typeof INGREDIENTS;
export const ORDERS: readonly (readonly [Layer, number][])[] = [
    [['корж', 0], ['глазурь', 1]],
    [['корж', 1], ['глазурь', 0], ['украшение', 0]],
    [['корж', 2], ['начинка', 2], ['глазурь', 2], ['украшение', 1]],
];

export class CakeOrders {
    accepted = 0;
    layers: number[] = [];
    get recipe() { return ORDERS[this.accepted]; }
    get complete() { return this.accepted === ORDERS.length; }
    get ready() { return !this.complete && this.layers.length === this.recipe.length; }

    add(ingredient: number): void {
        if (!this.complete && !this.ready && Number.isInteger(ingredient) && ingredient >= 0 && ingredient < 3) {
            this.layers.push(ingredient);
        }
    }

    submit(): 'incomplete' | 'correct' | number {
        if (!this.ready) return 'incomplete';
        const wrong = this.recipe.findIndex(([, ingredient], index) => this.layers[index] !== ingredient);
        if (wrong >= 0) {
            this.layers.length = wrong;
            return wrong;
        }
        this.layers = [];
        this.accepted++;
        return 'correct';
    }
}
