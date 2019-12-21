import { ChatPipe } from './chat.pipe';

describe('ChatPipe', () => {
  it('create an instance', () => {
    const pipe = new ChatPipe();
    expect(pipe).toBeTruthy();
  });
});
