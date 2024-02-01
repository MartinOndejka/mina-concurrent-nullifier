import {
  AccountUpdate,
  Bool,
  Field,
  Permissions,
  SmartContract,
  UInt64,
  method,
} from 'o1js';

export class ConcurrentEscrow extends SmartContract {
  @method deposit(amount: UInt64) {
    const senderAccountUpdate = AccountUpdate.createSigned(this.sender);
    senderAccountUpdate.send({ to: this.address, amount });
  }

  @method withdraw(amount: UInt64) {
    this.send({ to: this.sender, amount });

    const tokenAccountUpdate = AccountUpdate.createSigned(
      this.sender,
      this.token.id
    );

    this.approve(tokenAccountUpdate);

    tokenAccountUpdate.body.update.permissions = {
      isSome: Bool(true),
      value: { ...Permissions.default(), editState: Permissions.signature() },
    };

    tokenAccountUpdate.body.preconditions.account.state[0] = {
      isSome: Bool(true),
      value: Field(0),
    };

    tokenAccountUpdate.update.appState[0] = {
      isSome: Bool(true),
      value: Field(1),
    };
  }
}
