import { Body, Controller, Get, Post, Query, Headers } from '@nestjs/common';
import { AppService } from './app.service';
import { HttpServerService } from './http-server/http-server.service';
import { UserPermissions } from './constants';
import { DefaultTemplate } from './entities/DefaultTemplate';
import { defaultTemplateMap } from './DefaultTemplate';

@Controller('api')
export class AppController {
  constructor(private readonly httpServerService: HttpServerService) {}
  @Get('user')
  async getUser(
    @Headers('Authorization') token,
    @Query('id') id,
    @Query('name') name,
  ) {
    this.httpServerService.checkAccess(token);
    const data = await this.httpServerService.getUser(id, name);
    return { success: true, data };
  }

  @Post('user')
  async setUser(
    @Headers('Authorization') token,
    @Body('id') id,
    @Body('name') name,
    @Body('permissions') permissions,
    @Body('addperm') addperm,
    @Body('removeperm') removeperm,
  ) {
    this.httpServerService.checkAccess(token);
    await this.httpServerService.setUser(
      id,
      name,
      parseInt(permissions),
      addperm,
      removeperm,
    );
    return { success: true };
  }
  @Get('/values/perms')
  getAllPermissionValues() {
    return {
      success: true,
      data: { perms: Array.from(Object.keys(UserPermissions)) },
    };
  }
  @Get('/values/templates')
  getAllTemplateKeys() {
    return {
      success: true,
      data: { perms: Array.from(defaultTemplateMap.keys()) },
    };
  }
}
