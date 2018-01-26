import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Inputs } from "./index";
import { reload } from "../vendor/Reloader";
import { of } from "rxjs/observable/of";
import { async } from "rxjs/scheduler/async";
import { concat } from "rxjs/observable/concat";

export enum EffectNames {
    FileReload = "@@FileReload",
    PreBrowserReload = "@@PreBrowserReload",
    BrowserReload = "@@BrowserReload",
    BrowserSetLocation = "@@BrowserSetLocation",
    SetOptions = "@@SetOptions"
}

export function reloadBrowserSafe() {
    return concat(
        /**
         * Emit a message allow others to do some work
         */
        of([EffectNames.PreBrowserReload]),
        /**
         * On the next tick, perform the reload
         */
        of([EffectNames.BrowserReload]).subscribeOn(async)
    );
}

export type EffectEvent = [EffectNames] | [EffectNames, any] | EffectNames[];

export const outputHandlers$ = new BehaviorSubject({
    /**
     * Set the local client options
     * @param xs
     */
    [EffectNames.SetOptions]: (xs, inputs: Inputs) => {
        return xs.do(x => inputs.option$.next(x)).ignoreElements();
    },
    /**
     * Attempt to reload files in place
     * @param xs
     * @param inputs
     */
    [EffectNames.FileReload]: (xs, inputs: Inputs) => {
        return xs
            .withLatestFrom(inputs.option$, inputs.document$, inputs.navigator$)
            .flatMap(([event, options, document, navigator]) => {
                return reload(document, navigator)(event, {
                    tagNames: options.tagNames,
                    liveCSS: true,
                    liveImg: true
                });
            });
    },
    /**
     * Hard reload the browser
     */
    [EffectNames.BrowserReload]: (xs, inputs: Inputs) => {
        return xs
            .withLatestFrom(inputs.window$)
            .do(([, window]) => window.location.reload(true));
    },
    /**
     * Set the location of the browser
     */
    [EffectNames.BrowserSetLocation]: (xs, inputs: Inputs) => {
        return xs
            .withLatestFrom(inputs.window$)
            .do(([event, window]) => {
                if (event.path) {
                    return window.location = window.location.protocol + "//" + window.location.host + event.path;
                }
                if (event.url) {
                    return window.location = event.url;
                }
            })
            .ignoreElements()
    }
});