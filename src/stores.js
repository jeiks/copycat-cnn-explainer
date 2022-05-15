import { writable } from 'svelte/store';

export const cnnStore = writable([]);
export const svgStore = writable(undefined);

export const vSpaceAroundGapStore = writable(undefined);
export const hSpaceAroundGapStore = writable(undefined);

export const nodeCoordinateStore = writable([]);
export const selectedScaleLevelStore = writable(undefined);

export const cnnLayerRangesStore = writable({});
export const cnnLayerMinMaxStore = writable([]);

export const needRedrawStore = writable([undefined, undefined]);

export const detailedModeStore = writable(true);

export const shouldIntermediateAnimateStore = writable(false);

export const isInSoftmaxStore = writable(false);
export const softmaxDetailViewStore = writable({});
export const allowsSoftmaxAnimationStore = writable(false);

export const hoverInfoStore = writable({});

export const modalStore = writable({});

export const intermediateLayerPositionStore = writable({});


export const copycat_cnnStore = writable([]);
export const copycat_svgStore = writable(undefined);

export const copycat_vSpaceAroundGapStore = writable(undefined);
export const copycat_hSpaceAroundGapStore = writable(undefined);

export const copycat_nodeCoordinateStore = writable([]);
export const copycat_selectedScaleLevelStore = writable(undefined);

export const copycat_cnnLayerRangesStore = writable({});
export const copycat_cnnLayerMinMaxStore = writable([]);

export const copycat_needRedrawStore = writable([undefined, undefined]);

export const copycat_detailedModeStore = writable(true);

export const copycat_shouldIntermediateAnimateStore = writable(false);

export const copycat_isInSoftmaxStore = writable(false);
export const copycat_softmaxDetailViewStore = writable({});
export const copycat_allowsSoftmaxAnimationStore = writable(false);

export const copycat_hoverInfoStore = writable({});

export const copycat_modalStore = writable({});

export const copycat_intermediateLayerPositionStore = writable({});