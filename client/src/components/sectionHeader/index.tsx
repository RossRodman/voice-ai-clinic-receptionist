import { Typography } from "@mui/material";

import { Styled } from "@/styled";

interface SectionHeaderProps {
  id: string;
  title: string;
  description?: string;
}

export function SectionHeader({ id, title, description }: SectionHeaderProps) {
  return (
    <>
      <Typography id={id} variant="h3" component="h2">
        {title}
      </Typography>
      {description && <Typography sx={Styled.SectionDescription}>{description}</Typography>}
    </>
  );
}
