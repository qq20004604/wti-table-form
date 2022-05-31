<template>
    <div>
        <table class="form-table">
            <thead>
            <tr v-if="tableTitle">
                <td :colspan="tableTitleSpan" class="table-title">{{ tableTitle }}</td>
            </tr>
            </thead>
            <tbody>
            <template v-for="field in fields">
                <template v-for="formItem in field.children || []">
                    <tr :key="formItem.key"
                        v-if="hiddenKeyList.indexOf(formItem.key) === -1">
                        <td v-if="isBlockFirstRow(field) === formItem.key"
                            :rowspan="blockRowSpan(field)"
                            class="table-block-label"
                            :style="`width:${colWidth.leftWidth}`">
                            <span>{{ field.label }}</span>
                        </td>

                        <td v-if="!field.middleHide"
                            class="table-formitem-label"
                            :class="{'table-form-hidden-label':formItem.hideLabel}">
                            <span v-if="isFormItemRequire(formItem, 'middle')"
                                  class="required-sign">*</span>
                            <span>{{ formItem.label }}</span>
                            <span class="validate-error">{{ getValidateErrorMsg(formItem) }}</span>
                        </td>

                        <td class="table-formitem-value"
                            :colspan="field.middleHide?2:1"
                            :class="{'table-form-hidden-label':formItem.hideLabel}"
                            :style="`width:${colWidth.rightWidth}`">
                            <template v-if="textMode">
                                <span>{{ getText(formItem) }}</span>
                            </template>
                            <template v-else>
                                <el-input v-if="formItem.type ==='input'"
                                          :disabled="isFormItemDisabled(formItem.key)"
                                          v-model="formData[formItem.key]"/>

                                <template v-else-if="formItem.type === 'dynamic-radio'">
                                    <el-radio
                                        v-for="dictItem in dynamicDict[formItem.parentKey]"
                                        :key="dictItem[dynamicSelectOption.queryKey]"
                                        v-model="formData[formItem.key]"
                                        :label="dictItem[dynamicSelectOption.value]"
                                        :disabled="isFormItemDisabled(formItem.key)"
                                        @change="valueChange(formItem)">
                                        {{ dictItem[dynamicSelectOption.label] }}
                                    </el-radio>
                                </template>
                            </template>
                        </td>
                    </tr>
                </template>
            </template>
            </tbody>
        </table>
    </div>
</template>
<script>
    import createAxios from './ajax';

    export default {
        props: {
            tableTitle: {
                type: String,
                default: ''
            },
            tableTitleSpan: {
                type: Number,
                default: 3
            },

            data: {
                type: Object,
                default: () => {
                    return {};
                }
            },
            fields: {
                type: Array,
                default: () => {
                    return [];
                }
            },

            tableDetails: {
                type: Object,
                default: () => {
                    return {};
                }
            },
            colWidth: {
                type: Object,
                default: () => {
                    return {
                        leftWidth: '15%',
                        rightWidth: '60%'
                    };
                }
            },

            textMode: {
                type: Boolean,
                default: false
            },

            dynamicSelectOption: {
                type: Object,
                default: () => {
                    return {
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
                    };
                }
            }
        },
        name: 'WtiTableForm',
        data () {
            return {
                // tableData,
                // editDisabled: false, // 表格禁用
                // LinkageDisabled, // 联动禁用
                // pattern: [], // 数据字典
                // errorList: [], // 存储校验失败的参数
                // condition: {}, // 入参
                // realTimeCalibration: false, // 实时校验
                // functionCode: '',
                // taskStatus: '',
                // individual, // 特定节点展示

                // ——————————分割线——————————
                disableList: [], // 被禁用的列表
                hiddenKeyList: [], // 被隐藏的列表
                formData: {
                    d: '10005000'
                }, //  提交的数据
                dynamicDict: {}, // 动态下拉框
                baseURL: '/api', // 数据字典

                // 校验未通过
                validateNotPass: []
            };
        },
        created () {
            this.axios = createAxios(Object.assign({
                baseURL: this.baseURL
            }, this.axiosOptions));

            // this.initFields();

            // 加载初始情况下，默认禁用的要素
            this.getDefaultDisableList();
            // 默认隐藏
            this.getDefaultHiddenList();
            this.initFormData();
            this.initStatus();

            // 理论上，不应该动态添加 fileds。尽量 fields 通过事件，内部控制自己是否显示
            this.$watch('fields', (v) => {
                this.currentFileds = [];
                this.$nextTick(() => {
                    this.currentFileds = v;
                    this.getDefaultDisableList();
                    this.getDefaultHiddenList();
                    this.loadDynamicSelectOptions();
                    this.initFormData();
                    this.initStatus();
                });
            });

            this.$watch('data', () => {
                this.initFormData();
                this.initStatus();
            });
        },
        mounted () {
            this.loadDynamicSelectOptions();

            // this.initialization(); // 初始化
        },
        watch: {},
        methods: {
            // 当前是否是区块第一个（区块的最左侧列，放在第一个那一行。原因是因为可能有隐藏导致前几行不显示）
            isBlockFirstRow (block) {
                let firstNowHiddenKey = '';

                if (block.children && block.children.length > 0) {
                    for (let i = 0; i < block.children.length; i++) {
                        const item = block.children[i];
                        // 非隐藏的，第一个key，则为标题行
                        if (this.hiddenKeyList.indexOf(item.key) > -1) {
                            continue;
                        }
                        firstNowHiddenKey = item.key;
                        break;
                    }
                }
                return firstNowHiddenKey;
            },

            getCommonAxios () {
                return this.axios;
            },

            // 获取初始情况下，所有默认禁用要素
            getDefaultDisableList () {
                const disableList = [];
                // 遍历传入的数据
                this.fields.forEach(fields => {
                    if (fields.children && fields.children instanceof Array) {
                        fields.children.forEach(field => {
                            // 如果是true，则添加到禁用列表里
                            if (field.disableDefault) {
                                disableList.push(field.key);
                            }
                        });
                    }
                });

                this.disableList = disableList;
            },

            // 默认隐藏
            getDefaultHiddenList () {
                const hiddenList = [];
                // 遍历传入的数据
                this.fields.forEach(fields => {
                    if (fields.children && fields.children instanceof Array) {
                        fields.children.forEach(field => {
                            // 如果是true，则添加到禁用列表里
                            if (field.hiddenDefault) {
                                hiddenList.push(field.key);
                            }
                        });
                    }
                });

                this.hiddenKeyList = hiddenList;
            },

            // 初始化 formData 的值
            initFormData () {
                this.$set(this, 'formData', {});
                // console.log('initFormData');
                // 用 fileds 初始化 formData 的 key
                this.fields.forEach(fields => {
                    if (fields.children && fields.children instanceof Array) {
                        fields.children.forEach(field => {
                            // 处理初始值的问题
                            // 1. 如果是插槽，那么直接忽略这个
                            if (field.type === 'slot') {
                                return;
                            }

                            // 2. 如果该值在 data 里，则直接取 data 里的值（面对场景：数值回显）
                            if (field.key in this.data) {
                                this.$set(this.formData, field.key, this.data[field.key]);
                                // 赋值默认值的时候，触发事件通知上级
                                this.valueUpdateEvent({
                                    [field.key]: this.data[field.key]
                                });
                            } else {
                                // 3. 不需要回显的场景下
                                // 3.1 如果该要素有默认值，则使用默认值
                                if (field.defaultValue) {
                                    this.$set(this.formData, field.key, field.defaultValue);
                                    // 赋值默认值的时候，触发事件通知上级
                                    this.valueUpdateEvent({
                                        [field.key]: field.defaultValue
                                    });
                                } else {
                                    // 3.2 该要素没有默认值，使用通用默认值
                                    if (field.type === 'checkbox' ||
                                        field.type === 'dynamic-checkbox' ||
                                        field.type === 'mul-select-normal' ||
                                        field.type === 'dynamic-select-normal' ||
                                        field.type === 'dynamic-select-multiple') {
                                        this.$set(this.formData, field.key, []);
                                    } else if (field.type === 'area-select') {
                                        this.$set(this.formData, field.key, [ '', '', '' ]);
                                    } else {
                                        console.log('field.key', field.key);
                                        this.$set(this.formData, field.key, '');
                                    }
                                }
                            }
                        });
                    }
                });
            },

            // 监听值更新
            valueUpdateEvent (params) {
                this.$emit('updateValue', params);
            },

            // 初始化配置
            initFields () {
                const hiddenList = [];
                const disableList = [];
                // 遍历传入的数据
                this.fields.forEach(fields => {
                    if (fields.children && fields.children instanceof Array) {
                        fields.children.forEach(field => {
                            // 如果是true，则添加到禁用列表里
                            if (field.disableDefault) {
                                disableList.push(field.key);
                            }
                            if (field.hiddenDefault) {
                                hiddenList.push(field.key);
                            }
                        });
                    }
                });
                this.disableList = disableList;
                this.hiddenKeyList = hiddenList;
            },

            // 找到 type="dynamic-select" 获取所有 parentCode，然后读取数据字典接口拉取对应的数据
            loadDynamicSelectOptions () {
                const parentCodeList = [];
                // 遍历传入的数据
                this.fields.forEach(fields => {
                    if (fields.children && fields.children instanceof Array) {
                        fields.children.forEach(field => {
                            if ((field.type === 'dynamic-select' ||
                                field.type === 'dynamic-radio' ||
                                field.type === 'dynamic-checkbox' ||
                                field.type === 'dynamic-select-normal' ||
                                field.type === 'dynamic-select-multiple') && field.parentKey) {
                                // 再做一次去重判断。如果该字典已经在里面了，再跳过这一个
                                if (parentCodeList.indexOf(field.parentKey) === -1) {
                                    if (!(this.dynamicDict[field.parentKey] && this.dynamicDict[field.parentKey].length !== 0)) {
                                        parentCodeList.push(field.parentKey);
                                        // 初始化一个数组
                                        this.$set(this.dynamicDict, field.parentKey, []);
                                    }
                                }
                            }
                        });
                    }
                });
                if (parentCodeList.length === 0) {
                    return;
                }

                // 通过父 key 拿到所有元素
                let payload = null;
                // 这里判断是不是 axios 的默认返回数据（未经过请求拦截器处理的）
                if (this.dynamicSelectOption.queryKey) {
                    payload = {
                        [this.dynamicSelectOption.queryKey]: parentCodeList
                    };
                } else {
                    payload = parentCodeList;
                }
                // console.log('WtiForm 拉取动态字典');
                this.getCommonAxios().post(`${this.dynamicSelectOption.dictUrl}`, payload).then(res => {
                    // 兼容性处理
                    let data;
                    if (res.request && res.headers) {
                        data = res.data;
                    } else {
                        data = res;
                    }
                    if (data.code === 200) {
                        if (data.data.length > 0) {
                            // 因为可能多个地方同时调这个接口的原因，为了避免重复将内容添加到里面，所以，
                            // 这里在赋值之前，需要先判断一下 parentCodeList 的每个值，其对应的 dynamicDict 里的哪一个数组，是否是空的
                            // 如果不是空的，则将其置为空数组
                            parentCodeList.forEach(pCode => {
                                if (this.dynamicDict[pCode].length > 0) {
                                    this.$set(this.dynamicDict, pCode, []);
                                }
                            });

                            // 加载到结果
                            data.data.forEach(item => {
                                // 用每个返回值的 pCode 作为 key，将该项添加到数组里。
                                // 注：之所以是数组，是因为之前已经初始化过了（parentKey 为 Code）
                                const pCode = item[this.dynamicSelectOption.parentKey];
                                this.dynamicDict[pCode].push(
                                    item
                                );
                            });
                        }
                    } else {
                        this.$message.error(data.msg);
                    }
                }).catch(() => {
                    this.$message.error('数据字典加载错误，请刷新页面重试');
                });
            },

            // 获取校验不通过信息
            getValidateErrorMsg (formItem) {
                if (this.validateNotPass.length === 0) {
                    return '';
                }
                let errMsg = '';
                for (let i = 0; i < this.validateNotPass.length; i++) {
                    if (this.validateNotPass[i].key === formItem.key) {
                        errMsg = this.validateNotPass[i].msg;
                        break;
                    }
                }
                return errMsg;
            },

            // 该行是否必填（会有必填校验标志）
            isFormItemRequire (formItem) {
                if (this.hiddenKeyList.indexOf(formItem.key) > -1) {
                    return false;
                }

                let isRequired = false;
                if (formItem.rules && formItem.rules.length > 0) {
                    for (let i = 0; i < formItem.rules.length; i++) {
                        if (formItem.rules[i].required) {
                            isRequired = true;
                        }
                    }
                }
                return isRequired;
            },

            // 判断当前有几个
            blockRowSpan (field) {
                let count = 0;
                if (field && field.children && field.children.length > 0) {
                    field.children.forEach(formItem => {
                        if (this.hiddenKeyList.indexOf(formItem.key) === -1) {
                            count += 1;
                        }
                    });
                }
                return count;
            },

            // 获取到当前选择的数据
            getData () {
                // submitData 将不包含被隐藏的数据
                const submitData = {};
                this.validateNotPass = [];

                this.fields.forEach(block => {
                    if (block.children && block.children.length > 0) {
                        block.children.forEach(formItem => {
                            const isRequired = this.isFormItemRequire(formItem);
                            // 如果该选项必填，并且该必填项在formData里没有值
                            if (isRequired && !this.formData[formItem.key]) {
                                this.validateNotPass.push({
                                    key: formItem.key,
                                    msg: '请输入'
                                });
                            }

                            if (this.hiddenKeyList.indexOf(formItem.key) === -1) {
                                submitData[formItem.key] = this.formData[formItem.key];
                            }
                        });
                    }
                });

                return {
                    isPass: this.validateNotPass.length === 0,
                    submitData
                };
            },

            getText (formItem) {
                if (formItem.type === 'input') {
                    return this.formData[formItem.key];
                } else if (formItem.type === 'dynamic-radio') {
                    const pkey = formItem.parentKey;
                    const val = this.formData[formItem.key];
                    let text = '';
                    if (this.dynamicDict[pkey] && this.dynamicDict[pkey].length > 0) {
                        this.dynamicDict[pkey].forEach(item => {
                            if (item[this.dynamicSelectOption.value] === val) {
                                text = item[this.dynamicSelectOption.label];
                            }
                        });
                    }
                    return text;
                }
            },

            // 初始化要素的 隐藏/显示、禁用/非禁用 状态等
            // 在父组件 data 更新的时候，调用这个方法
            initStatus () {
                // 遍历传入的数据
                this.fields.forEach(block => {
                    if (block.children && block.children instanceof Array) {
                        block.children.forEach(formitem => {
                            // 如果有联动项，那么则遍历每个联动项
                            if (formitem.valueLink && formitem.valueLink.length && formitem.valueLink.length > 0) {
                                const {key} = formitem;
                                const v = this.data[key];
                                // 遍历
                                formitem.valueLink.forEach(linkItem => {
                                    // 如果联动项的触发值不匹配，则跳过这一条
                                    if (v !== linkItem.value) {
                                        return;
                                    }
                                    // 此时匹配，判断 linkList 有没有
                                    if (linkItem.linkList && linkItem.linkList.length && linkItem.linkList.length > 0) {
                                        // 再遍历
                                        linkItem.linkList.forEach(triggerItem => {
                                            const linkKey = triggerItem.linkKey;
                                            // 如果没有联动 key，则跳过（正常来说，不会没有）
                                            if (!linkKey) {
                                                return;
                                            }
                                            // 如果联动值，则更新值
                                            if (triggerItem.enableLinkValue) {
                                                this.updateFormData({[linkKey]: triggerItem.linkValue});
                                            }
                                            // 如果联动禁用/取消禁用，则更新禁用
                                            if (triggerItem.enableLinkDisable) {
                                                this.setElementDisable(linkKey, triggerItem.linkDisable);
                                            }
                                            // 如果联动隐藏/显示，则更新
                                            if (triggerItem.enableLinkHidden) {
                                                this.setElementHidden(linkKey, triggerItem.linkHidden);
                                            }
                                            // 如果联动必填/非必填，则更新
                                            if (triggerItem.enableLinkRequired) {
                                                this.setElementRequired(linkKey, triggerItem.linkRequired);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            },

            // 更新数据
            updateFormData (data) {
                Object.keys(data).forEach(key => {
                    // 如果 key 在值里面
                    if (key in this.formData) {
                        // 则回填这个值
                        this.$set(this.formData, key, data[key]);
                    }
                });
            },

            // 设置某个要素禁用
            // key：操作的 key
            // beDisable：必填，默认是 true，表示禁用。而 false，表示取消禁用
            setElementDisable (key, beDisable = true) {
                // 设置禁用
                if (beDisable) {
                    // 已经禁用了，则跳过。否则则添加进去
                    if (this.disableList.indexOf(key) === -1) {
                        this.disableList.push(key);
                    }
                } else {
                    // 取消禁用
                    // 未禁用则跳过。已经禁用，则继续
                    const index = this.disableList.indexOf(key);
                    if (index > -1) {
                        this.disableList = [
                            ...this.disableList.slice(0, index),
                            ...this.disableList.slice(index + 1)
                        ];
                    }
                }
            },

            // 设置某个要素隐藏
            // key：操作的 key
            // beHidden：必填，默认是 true，表示隐藏。而 false，表示取消隐藏
            setElementHidden (key, beHidden = true) {
                console.log('setElementHidden', key);
                // 设置隐藏
                if (beHidden) {
                    // 已经禁用了，则跳过。否则则添加进去
                    if (this.hiddenKeyList.indexOf(key) === -1) {
                        console.log('this.hiddenKeyList.push(key);', key);
                        this.hiddenKeyList.push(key);
                    }
                } else {
                    // 取消禁用
                    // 未禁用则跳过。已经禁用，则继续
                    const index = this.hiddenKeyList.indexOf(key);
                    if (index > -1) {
                        this.hiddenKeyList = [
                            ...this.hiddenKeyList.slice(0, index),
                            ...this.hiddenKeyList.slice(index + 1)
                        ];
                    }
                }
            },

            // 设置某个要素必填
            // key：操作的 key
            // beHidden：必填，默认是 true，表示隐藏。而 false，表示取消隐藏
            setElementRequired (key, beRequired = true) {
                // 设置必填
                if (beRequired) {
                    // 先找到这个要素，如果其本身必填，则跳过。
                    // 遍历传入的数据
                    this.fields.forEach(block => {
                        if (block.children && block.children instanceof Array) {
                            block.children.forEach(formItem => {
                                // 如果 key 不匹配，则跳过
                                if (formItem.key !== key) {
                                    return;
                                }
                                // 先判断有没有 rules 这个属性，没有则添加这个属性，并且添加必填项然后返回
                                if (!formItem.rules) {
                                    this.$set(formItem, 'rules', [
                                        {
                                            'required': true,
                                            'message': '请输入',
                                            'trigger': [
                                                'blur',
                                                'change'
                                            ]
                                        }
                                    ]);
                                    return;
                                }

                                // 遍历 其 rules，
                                const {rules} = formItem;
                                // 是否有 required 这条规则
                                let haveRequired = false;
                                // 是否已修改
                                let changed = false;
                                rules.forEach(rule => {
                                    // 如果有 required 属性
                                    if ('required' in rule) {
                                        haveRequired = true;
                                        // 如果值为 true，则跳过
                                        if (rule.required) {
                                            return;
                                        } else {
                                            // 否则修改其为 true
                                            rule.required = true;
                                            changed = true;
                                        }
                                    }
                                });
                                // 如果已修改，那么说明没必要继续操作了，跳过
                                if (changed) {
                                    return;
                                }
                                // 如果没修改，并且没有必填规则
                                // （注意，如果有规则，那么必然已修改。所以只存在有规则已修改、未修改有规则、未修改无规则三种情况）
                                if (!haveRequired) {
                                    // 添加规则
                                    rules.push({
                                        'required': true,
                                        'message': '请输入',
                                        'trigger': [
                                            'blur',
                                            'change'
                                        ]
                                    });
                                }
                            });
                        }
                    });
                } else {
                    // 取消必填
                    // 不含必填规则的话，则跳过。如果含必填规则，则添加
                    this.fields.forEach(block => {
                        if (block.children && block.children instanceof Array) {
                            block.children.forEach(formItem => {
                                // 如果 key 不匹配，则跳过
                                if (formItem.key !== key) {
                                    return;
                                }

                                // 先判断有没有 rules 这个属性，没有则添加这个属性，并且添加必填项然后返回
                                if (!formItem.rules) {
                                    return;
                                }
                                // 如果有，则遍历并删除
                                let i = -1;
                                formItem.rules.forEach((rule, index) => {
                                    if ('required' in rule) {
                                        i = index;
                                    }
                                });
                                if (i !== -1) {
                                    formItem.rules.splice(i, 1);
                                }
                            });
                        }
                    });
                }
            },

            valueChange (formItem) {
                const v = this.formData[formItem.key];
                // console.log('v', v);
                // 如果有联动项，那么则遍历每个联动项
                if (formItem.valueLink && formItem.valueLink.length &&
                    formItem.valueLink.length > 0) {
                    // 遍历
                    formItem.valueLink.forEach(linkItem => {
                        // 防止多选下拉框或其他多选的联动出现问题
                        // 在这里还要判断它是不是checkbox类型
                        // 为了扩展性，在配置项添加 multiSelectGanged 确保联动值和选中值为数组的情况下
                        // let status = false;
                        // if (Object.prototype.toString.call(v) === '[object Array]' && formItem.multiSelectGanged) {
                        //     status = linkItem.value.every(item => {
                        //         return v.indexOf(item) >= 0;
                        //     })
                        // }
                        // 如果值是数组，并且
                        // 如果联动项的触发值不匹配，则跳过这一条
                        // 如果v不是数组，并且联动的值不等于v
                        // 或者 v是数组，并且联动的值不存在于v
                        // if ((Object.prototype.toString.call(v) !== '[object Array]' && v !== linkItem.value) || (Object.prototype.toString.call(v) === '[object Array]' && v.indexOf(linkItem.value) === -1)) {
                        //     return;
                        // }
                        if (v !== linkItem.value) {
                            return;
                        }
                        // console.log('123', v, linkItem.value, v === linkItem.value);
                        // 此时匹配，判断 linkList 有没有
                        if (linkItem.linkList && linkItem.linkList.length &&
                            linkItem.linkList.length > 0) {
                            // 再遍历
                            linkItem.linkList.forEach(triggerItem => {
                                const linkKey = triggerItem.linkKey;
                                // console.log('linkKey', linkKey);
                                // 如果没有联动 key，则跳过（正常来说，不会没有）
                                if (!linkKey) {
                                    return;
                                }
                                // 如果联动值，则更新值
                                if (triggerItem.enableLinkValue) {
                                    this.updateFormData({[linkKey]: triggerItem.linkValue});
                                }
                                // 如果联动禁用/取消禁用，则更新禁用
                                if (triggerItem.enableLinkDisable) {
                                    this.setElementDisable(linkKey, triggerItem.linkDisable);
                                }
                                // 如果联动隐藏/显示，则更新
                                if (triggerItem.enableLinkHidden) {
                                    this.setElementHidden(linkKey, triggerItem.linkHidden);
                                }
                                // 如果联动必填/非必填，则更新
                                if (triggerItem.enableLinkRequired) {
                                    this.setElementRequired(linkKey, triggerItem.linkRequired);
                                }
                            });
                        }
                    });
                }
            },

            isFormItemDisabled (key) {
                if (this.disableList.indexOf(key) > -1) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    };
</script>
<style scoped lang="less">
    @import './form_table.less';

    .form-table {
        border-collapse: collapse;
        width: 100%;

        font-size: 14px;
        color: #606266;

        tr, td {
            border: 1px solid #EBEEF5;
        }

        .table-title {
            width: 100%;
            border-top: 1px solid rgb(235, 238, 245);
            border-right: 1px solid rgb(235, 238, 245);
            border-bottom: none;
            border-left: 1px solid rgb(235, 238, 245);
            border-image: initial;
            height: 48px;
            text-align: center;
            line-height: 48px;
            font-size: 0.9rem;
            color: rgb(98, 96, 102);
        }

        span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: normal;
            word-break: break-all;
            line-height: 23px;
        }

        .table-block-label {
            vertical-align: middle;
            position: relative;
            text-align: left;
            padding: 12px 10px;
            //width: 14%;
            background: #f8f9fb;
        }

        .table-formitem-label {
            vertical-align: middle;
            position: relative;
            text-align: left;
            padding: 12px 10px;
            //width: 43%;

            .required-sign {
                color: rgb(245, 108, 108);
            }

            .validate-error {
                padding-left: 20px;
                color: rgb(245, 108, 108);
            }

            &.table-form-hidden-label {
                border-right: none;
            }
        }

        .table-formitem-value {
            vertical-align: middle;
            position: relative;
            text-align: left;
            padding: 12px 10px;
            line-height: 22px;
            //width: 43%;

            &.table-form-hidden-label {
                border-left: none;
            }
        }


    }
</style>
