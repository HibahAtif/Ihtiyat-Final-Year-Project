/**
 * Responsive sizing helpers for my app.
 *
 * UI measurements are derived from the current viewport rather than fixed
 * device-independent pixel values. Keeping the calculations here gives the
 * application one consistent responsive-sizing strategy.
 */

/**
 * Uses the shorter viewport dimension as the main sizing reference.
 *
 * This behaves more consistently across portrait phones, landscape layouts,
 * tablets, and differently proportioned Android devices than relying on width
 * alone.
 */
export const getShortDimension = (
	width: number,
	height: number,
): number => Math.min(width, height);

/**
 * Returns a responsive size based on a proportion of the shortest viewport
 * dimension.
 */
export const responsiveSize = (
	width: number,
	height: number,
	ratio: number,
): number => getShortDimension(width, height) * ratio;