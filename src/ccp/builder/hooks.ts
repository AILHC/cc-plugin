// import CCP from '../entry-render'
import * as Path from 'path'
import * as Fs from 'fs';
import { BuilderOptions } from '../../declare';

// 运行在渲染进程
export function onAfterBuild(buildOptions: any, buildResult: any) {
    const packageFile = Path.join(__dirname, 'package.json')
    if (!Fs.existsSync(packageFile)) {
        console.log(`无法找到文件：${packageFile}`)
        return
    }
    //todo require的方式需要后续优化
    const result = eval(`require('${packageFile}')`)
    const pkgName = result.name;//CCP.manifest!.name;
    if (pkgName) {
        // todo 这个参数也是写死的，后续需要优化
        const func = 'onBuilder';
        const { buildPath, name, outputName, platform, md5Cache } = buildOptions;
        // @ts-ignore 发送到主进程
        Editor.Message.request(pkgName, func, { buildPath, name, outputName, platform, md5Cache });
    }
}
