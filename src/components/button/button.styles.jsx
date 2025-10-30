import styled, { css } from "styled-components";

const buttonStyles = css`
  width: 100%;
  max-width: 220px;
  height: 3rem;
  padding: 0 1.5rem;
  font-size: 0.875rem;
  background-color: black;
  color: white;
  text-transform: uppercase;
  font-family: "Open Sans", sans-serif;
  font-weight: bold;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
  transition: all 0.3s ease;

  &:hover {
    background-color: white;
    color: black;
    border: 1px solid black;
  }

  @media (min-width: 768px) {
    height: 3.5rem;
    font-size: 1rem;
  }
`;

export const BaseButton = styled.button`
  ${buttonStyles}
`;

export const GoogleSignInButton = styled(BaseButton)`
  background-color: #4285f4;
  color: white;
  white-space: nowrap;

  &:hover {
    background-color: #357ae8;
    color: white;
    border: none;
  }
`;

export const InvertedButton = styled(BaseButton)`
  background-color: white;
  color: black;
  border: 1px solid black;

  &:hover {
    background-color: black;
    color: white;
    border: none;
  }
`;
