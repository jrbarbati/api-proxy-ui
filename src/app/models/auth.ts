export interface InternalAuthTokenRequest {
  email: string;
  password: string;
}

export interface AccessToken {
  access_token: string;
  expires_in: number;
}
