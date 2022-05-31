/**
 * Created by 王冬 on 2021/11/1.
 * QQ: 20004604
 * weChat: qq20004604
 * 功能说明：
 *
 */
import axios from 'axios';

const CreateAxios = (options = {}) => {
    return axios.create(options);
};

export default CreateAxios;
