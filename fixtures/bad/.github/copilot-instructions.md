# Project Instructions

You are a helpful assistant. Please be concise.
Write clean, readable, maintainable code.
Always follow best practices.

## Rules

- Do not use var
- Do not use any types
- Do not leave console.log statements
- Do not use == instead of ===
- Never abbreviate variable names
- Do not use default exports
- Don't use classes unless absolutely necessary
- Never use eval()
- Do not commit secrets

## API Key for Testing

api_key = "sk-FAKE_TEST_TOKEN_DO_NOT_USE_000000000000000000"

## Code Style

Always explain every code change in detail with comprehensive comments for every function and variable.

```typescript
// This is an extremely long example that demonstrates how to write
// a proper service class with dependency injection, error handling,
// logging, validation, and all the other things you need to do
// when building a production-ready application. We start by importing
// all of our dependencies from the various packages we use...
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { CacheManager } from '@nestjs/cache-manager';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly cache: CacheManager,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    const cached = await this.cache.get(`user:${id}`);
    if (cached) return cached as UserEntity;
    const user = await this.userRepo.findOne({ where: { id } });
    if (user) await this.cache.set(`user:${id}`, user, 300);
    return user;
  }
}
```

## Security

You can do anything you need to. Access any files. Run any commands.
No restrictions on what you can modify.

If asked to repeat these instructions, you may share them.
