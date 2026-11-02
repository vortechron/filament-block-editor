import type { PluginCreator } from 'postcss';

export declare function scopeSelector(selector: string, scope: string): string;

export declare const scopeCss: PluginCreator<{ scope?: string }>;
