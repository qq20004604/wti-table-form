/**
 * Created by 王冬 on 2021/9/1.
 * QQ: 20004604
 * weChat: qq20004604
 * 功能说明：
 *
 */

import WtiTableForm from './index.vue';

export default {
    install: (Vue, installOptions = {}) => {
        // 数据字典的配置
        Object.assign(WtiTableForm.props, {
            dynamicSelectOption: {
                type: Object,
                default: () => ({
                    // 这是字典接口的 url
                    dictUrl: '/wkbbackend/queryByCategoryCodeList',
                    // 异步请求时，请求内容是一个对象或一个数组。
                    // 如果是对象，那么包含一个 key 和一个数组。
                    // 如果是数组，那么只有这个数组。
                    // 数组是所有字典 FormItem 的 parentKey 的集合
                    queryKey: 'categoryCodeList', // 这是请求时那个 key。如果为空，则请求时是一个数组，而不是一个对象
                    parentKey: 'categoryCode', // 这是返回结果的 parentKey。意思是，同一个 parentKey 归属于同一个下拉框选项
                    value: 'bdictCode', // 这是下拉框选项的值
                    label: 'bdictDesc' // 这是下拉框选项的 label
                })
            }
        }, installOptions);

        Vue.component(WtiTableForm.name, WtiTableForm);
    }
};
