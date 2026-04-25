/**
 * Базовый класс экшена.
 * Хранит тип действия и полезную нагрузку, если она требуется.
 */
export class Action<TType extends string = string, TPayload = unknown> {
  public readonly type: TType;
  public readonly payload: TPayload;

  public constructor(type: TType, payload: TPayload) {
    this.type = type;
    this.payload = payload;
  }
}
