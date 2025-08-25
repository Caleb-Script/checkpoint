export class AddAttributeDTO {
  guestProfileId!: string;
  attribute!: string;
  value!: string;
  mode!: AttributeModeType;
}

export type AttributeModeType = 'remove' | 'append' | 'set';
