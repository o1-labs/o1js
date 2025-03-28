declare namespace Mina {
    type TransactionType = ['ZkappCommand', '...'][number];
    interface Transaction {
        type: TransactionType;
    }

    class T implements Transaction {
        type: 'ZkappCommand';
        constructor();
    }
}
