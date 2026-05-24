FROM node:22-alpine AS client-build
WORKDIR /src/client
COPY client/package*.json ./
RUN npm ci
COPY client ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS server-build
WORKDIR /src
COPY server/server.csproj server/
RUN dotnet restore server/server.csproj
COPY server server/
COPY --from=client-build /src/client/dist server/wwwroot
RUN dotnet publish server/server.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=server-build /app/publish ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "server.dll"]
