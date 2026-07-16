export enum ChatSessionStatus {
    IDLE = 0, //空闲
    ACTIVE = 1, //活跃
    ARCHIVED = 2 //已归档
}

export enum ChatQueryMode {
    OPEN_CHAT = 'OPEN_CHAT',  //自由对话
    AUTO_DOCUMENT = 'AUTO_DOCUMENT', //自动文档查询
    CURRENT_DOCUMENT = 'CURRENT_DOCUMENT' //指定文档查询
}

export enum ExchangeState {
    STARTED = 0, //已开始
    IN_PROGRESS = 1, //进行中
    COMPLETED = 2, //已完成
    FAILED = 3 //已失败
}

export enum ExecutionMode {
    RETRIEVAL = 'RETRIEVAL', //检索模式 ，仅检索向量数据库
    REACT_AGENT = 'REACT_AGENT', //react模式
    GRAPH_ONLY = 'GRAPH_ONLY',//仅图模式，仅查询图数据库
    GRAPH_THEN_EVIFENCE = 'GRAPH_THEN_EVIFENCE',//图后证据模式，先查图数据库，再用检索内容补充
    CLARIFICATION = 'CLARIFICATION',//澄清模式，追问
    RAG_CHAT = 'RAG_CHAT' //rag模式
}
