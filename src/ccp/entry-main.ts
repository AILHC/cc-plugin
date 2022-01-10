import { PluginMainWrapper, CocosPluginManifest, CocosPluginOptions, CocosPluginConfig } from '../declare';
import adaptation, { Adaptation } from './adaptation'

export class CocosCreatorPluginMain {
    public manifest: CocosPluginManifest | null = null;
    public options: CocosPluginOptions | null = null;
    public Adaptation: Adaptation = adaptation;
    public wrapper: PluginMainWrapper | null = null;

    public init(config: CocosPluginConfig, wrapper: PluginMainWrapper) {
        this.manifest = config.manifest;
        this.options = config.options;
        this.wrapper = wrapper;
        this.Adaptation.init(config)
    }
}

const CCP = new CocosCreatorPluginMain();
export default CCP;
