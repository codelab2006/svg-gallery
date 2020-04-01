export default
`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SVG Gallery</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        list-style: none;
      }
      .path {
        word-break: break-all;
        font-size: medium;
        font-weight: normal;
        padding: 5px;
        border: 1px solid;
        line-height: 18px;
      }
      .item-container {
        display: flex;
        flex-wrap: wrap;
      }
      .item {
        background-color: #f2f2f2;
        padding: 10px;
        margin: 5px;
        width: 120px;
        height: 148px;
        display: flex;
        flex-direction: column;
      }
      .img-container {
        display: flex;
        flex-direction: column;
        width: 100px;
        height: 100px;
        align-items: center;
        justify-content: center;
      }
      .image {
        display: block;
      }
      .name {
        display: block;
        width: 100px;
        padding: 2px;
        margin-top: 5px;
        cursor: auto;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <ul>
      <%_ sections.forEach((e) => { _%>
      <li>
        <%- e %>
      </li>
      <%_ }) _%>
    </ul>
  </body>
</html>
`;
