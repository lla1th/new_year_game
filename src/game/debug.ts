/** Debug mode is on when the page URL has `?debug=1`. */
export function isDebug(search: string = typeof location !== 'undefined' ? location.search : ''): boolean {
    return new URLSearchParams(search).get('debug') === '1';
}
