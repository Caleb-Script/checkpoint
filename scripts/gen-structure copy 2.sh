#!/usr/bin/env bash
# Nutzung:
#   ./scripts/gen-resource.sh user

set -e

if [ -z "$1" ]; then
  echo "❌ Bitte Ressourcennamen angeben"
  exit 1
fi

NAME_RAW="$1"

# --- Helferfunktionen ---
to_pascal() {
  # Alles klein, dann - und _ durch Leerzeichen ersetzen
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/[-_]/ /g' \
  | awk '{ for (i=1;i<=NF;i++) { $i = toupper(substr($i,1,1)) substr($i,2) } }1' \
  | tr -d ' '
}

to_camel() {
  local pascal
  pascal=$(to_pascal "$1")
  # Erstes Zeichen klein machen
  echo "$(echo "$pascal" | cut -c1 | tr '[:upper:]' '[:lower:]')$(echo "$pascal" | cut -c2-)"
}

PASCAL=$(to_pascal "$NAME_RAW")    # z.B. User
CAMEL=$(to_camel "$NAME_RAW")      # z.B. user
KEBAB=$(echo "$NAME_RAW" | tr '[:upper:]' '[:lower:]' | sed -e 's/_/-/g')

BASE_DIR="./$KEBAB"

mkdir -p "$BASE_DIR/models/entity" "$BASE_DIR/models/dto" "$BASE_DIR/service" "$BASE_DIR/resolver"

# Entity
cat > "$BASE_DIR/models/entity/$KEBAB.entity.ts" <<EOF
import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType("${PASCAL}")
export class ${PASCAL} {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  name?: string;
}
EOF

# Create DTO
cat > "$BASE_DIR/models/dto/create-$KEBAB.dto.ts" <<EOF
import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class Create${PASCAL}Input {
  @Field({ nullable: true })
  name?: string;
}
EOF

# Update DTO
cat > "$BASE_DIR/models/dto/update-$KEBAB.dto.ts" <<EOF
import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class Update${PASCAL}Input {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  name?: string;
}
EOF

# Read Service
cat > "$BASE_DIR/service/$KEBAB-read.service.ts" <<EOF
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma/prisma.service.js";

@Injectable()
export class ${PASCAL}ReadService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return (this.prisma as any).${CAMEL}.findUnique({ where: { id } });
  }

  find(params: any = {}) {
    return (this.prisma as any).${CAMEL}.findMany(params);
  }
}
EOF

# Write Service
cat > "$BASE_DIR/service/$KEBAB-write.service.ts" <<EOF
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma/prisma.service.js";
import { Create${PASCAL}Input } from "../models/dto/create-${KEBAB}.dto.js";
import { Update${PASCAL}Input } from "../models/dto/update-${KEBAB}.dto.js";

@Injectable()
export class ${PASCAL}WriteService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: Create${PASCAL}Input) {
    return (this.prisma as any).${CAMEL}.create({ data: input });
  }

  update(input: Update${PASCAL}Input) {
    const { id, ...data } = input;
    return (this.prisma as any).${CAMEL}.update({ where: { id }, data });
  }

  delete(id: string) {
    return (this.prisma as any).${CAMEL}.delete({ where: { id } });
  }
}
EOF

# Query Resolver
cat > "$BASE_DIR/resolver/$KEBAB-query.resolver.ts" <<EOF
import { Args, ID, Query, Resolver } from "@nestjs/graphql";
import { ${PASCAL} } from "../models/entity/${KEBAB}.entity.js";
import { ${PASCAL}ReadService } from "../service/${KEBAB}-read.service.js";

@Resolver(() => ${PASCAL})
export class ${PASCAL}QueryResolver {
  constructor(private readonly read: ${PASCAL}ReadService) {}

  @Query(() => ${PASCAL}, { name: "get${PASCAL}ById", nullable: true })
  get${PASCAL}ById(@Args("id", { type: () => ID }) id: string) {
    return this.read.findById(id);
  }

  @Query(() => [${PASCAL}], { name: "get${PASCAL}s" })
  get${PASCAL}s() {
    return this.read.find();
  }
}
EOF

# Mutation Resolver
cat > "$BASE_DIR/resolver/$KEBAB-mutation.resolver.ts" <<EOF
import { Args, ID, Mutation, Resolver } from "@nestjs/graphql";
import { ${PASCAL} } from "../models/entity/${KEBAB}.entity.js";
import { ${PASCAL}WriteService } from "../service/${KEBAB}-write.service.js";
import { Create${PASCAL}Input } from "../models/dto/create-${KEBAB}.dto.js";
import { Update${PASCAL}Input } from "../models/dto/update-${KEBAB}.dto.js";

@Resolver(() => ${PASCAL})
export class ${PASCAL}MutationResolver {
  constructor(private readonly write: ${PASCAL}WriteService) {}

  @Mutation(() => ${PASCAL}, { name: "create${PASCAL}" })
  create${PASCAL}(@Args("input") input: Create${PASCAL}Input) {
    return this.write.create(input);
  }

  @Mutation(() => ${PASCAL}, { name: "update${PASCAL}" })
  update${PASCAL}(@Args("input") input: Update${PASCAL}Input) {
    return this.write.update(input);
  }

  @Mutation(() => ${PASCAL}, { name: "delete${PASCAL}" })
  delete${PASCAL}(@Args("id", { type: () => ID }) id: string) {
    return this.write.delete(id);
  }
}
EOF

# Module
cat > "$BASE_DIR/$KEBAB.module.ts" <<EOF
import { Module } from "@nestjs/common";
import { ${PASCAL}ReadService } from "./service/${KEBAB}-read.service.js";
import { ${PASCAL}WriteService } from "./service/${KEBAB}-write.service.js";
import { ${PASCAL}QueryResolver } from "./resolver/${KEBAB}-query.resolver.js";
import { ${PASCAL}MutationResolver } from "./resolver/${KEBAB}-mutation.resolver.js";
import { PrismaModule } from "@app/prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ${PASCAL}ReadService,
    ${PASCAL}WriteService,
    ${PASCAL}QueryResolver,
    ${PASCAL}MutationResolver
  ]
})
export class ${PASCAL}Module {}
EOF

echo "✅ Ressource '$PASCAL' erzeugt unter: $BASE_DIR"
