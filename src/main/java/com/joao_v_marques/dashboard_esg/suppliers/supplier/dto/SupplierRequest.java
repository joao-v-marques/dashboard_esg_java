package com.joao_v_marques.dashboard_esg.suppliers.supplier.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.br.CNPJ;

public record SupplierRequest(

        // CNPJ alfanumérico (12 posições alfanuméricas + 2 dígitos verificadores), sem máscara e em maiúsculas
        @NotBlank(message = "Informe o CNPJ do fornecedor.")
        @Pattern(regexp = "[0-9A-Z]{12}\\d{2}", message = "O CNPJ deve conter 14 caracteres, sem máscara e em maiúsculas.")
        @CNPJ(format = CNPJ.Format.ALPHANUMERIC, message = "Informe um CNPJ válido.")
        String cnpj,

        @NotBlank(message = "Informe a razão social do fornecedor.")
        @Size(max = 255, message = "A razão social deve conter no máximo 255 caracteres.")
        String corporateName,

        @Size(max = 255, message = "O nome fantasia deve conter no máximo 255 caracteres.")
        String tradeName,

        // Formato varia por estado, e pode ser ISENTO
        @NotBlank(message = "Informe a IE do fornecedor (ou ISENTO).")
        @Size(max = 20, message = "A IE deve conter no máximo 20 caracteres.")
        String stateRegistration,

        @NotNull(message = "Informe o produto/serviço fornecido.")
        @Positive(message = "Informe um produto/serviço válido.")
        Integer supplyCategoryId,

        String productDescription,

        @Pattern(regexp = "\\d{8}", message = "O CEP deve conter 8 dígitos, apenas números.")
        String zipCode,

        @Size(max = 255, message = "A rua deve conter no máximo 255 caracteres.")
        String street,

        @Size(max = 255, message = "O número do endereço deve conter no máximo 255 caracteres.")
        String number,

        @Size(max = 100, message = "O complemento deve conter no máximo 100 caracteres.")
        String complement,

        @Size(max = 100, message = "O bairro deve conter no máximo 100 caracteres.")
        String neighborhood,

        @Size(max = 100, message = "A cidade deve conter no máximo 100 caracteres.")
        String city,

        @Pattern(regexp = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO", message = "Informe uma UF válida.")
        String state,

        // Contato
        @NotBlank(message = "Informe o telefone do fornecedor.")
        @Pattern(regexp = "\\d{10,11}", message = "O telefone deve conter DDD + número (10 ou 11 dígitos, apenas números).")
        String phone,

        @NotBlank(message = "Informe o nome do contato.")
        @Size(max = 150, message = "O nome do contato deve conter no máximo 150 caracteres.")
        String contactName,

        @NotBlank(message = "Informe o e-mail do fornecedor.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 255, message = "O e-mail deve conter no máximo 255 caracteres.")
        String email,

        @Size(max = 255, message = "O site deve conter no máximo 255 caracteres.")
        String website,

        // Dados bancários
        @NotNull(message = "Informe o banco.")
        @Positive(message = "Informe um banco válido.")
        Integer bankId,

        @NotBlank(message = "Informe a agência.")
        @Size(max = 10, message = "A agência deve conter no máximo 10 caracteres.")
        String agency,

        @NotBlank(message = "Informe a conta.")
        @Size(max = 20, message = "A conta deve conter no máximo 20 caracteres.")
        String account
) {
}
