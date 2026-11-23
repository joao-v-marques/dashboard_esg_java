package com.joao_v_marques.dashboard_esg.lawsuits.judging_body;

import com.joao_v_marques.dashboard_esg.lawsuits.judging_body.dto.JudgingBodyRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.judging_body.dto.JudgingBodyResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class JudgingBodyService {

    private final JudgingBodyRepository judgingBodyRepository;

    public JudgingBodyService(JudgingBodyRepository judgingBodyRepository) {
        this.judgingBodyRepository = judgingBodyRepository;
    }

    // GET de todos os órgãos julgadores cadastrados
    @Transactional(readOnly = true)
    public List<JudgingBodyResponse> findAll() {
        return judgingBodyRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public JudgingBodyResponse create(JudgingBodyRequest request) {
        String name = request.name().trim();

        if (judgingBodyRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("O órgão julgador que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        JudgingBody judgingBody = new JudgingBody();
        judgingBody.setName(name);

        JudgingBody saved = judgingBodyRepository.save(judgingBody);

        return toResponse(saved);
    }

    @Transactional
    public JudgingBodyResponse update(Integer judgingBodyId, JudgingBodyRequest request) {
        String name = request.name().trim();

        // Valida se o órgão julgador editado realmente existe
        JudgingBody judgingBody = judgingBodyRepository.findById(judgingBodyId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum órgão julgador com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!judgingBody.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma ocorrência inativa.");
        }

        if (judgingBodyRepository.existsByNameIgnoreCaseAndIdNot(name, judgingBodyId)) {
            throw new ConflictException("Já existe outro órgão julgador cadastrado com este nome");
        }

        // Atualizar a entidade já existente
        judgingBody.setName(name);

        return toResponse(judgingBody);
    }

    @Transactional
    public JudgingBodyResponse deactivate(Integer judgingBodyId) {
        // Valida se o órgão julgador desativado realmente existe
        JudgingBody judgingBody = judgingBodyRepository.findById(judgingBodyId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum órgão julgador com o ID fornecido."));

        if (!judgingBody.isActive()) {
            throw new IllegalArgumentException("Este órgão julgador já está inativo.");
        }

        judgingBody.setActive(false);

        return toResponse(judgingBody);
    }

    @Transactional
    public JudgingBodyResponse reactivate(Integer judgingBodyId) {
        // Valida se o órgão julgador reativado realmente existe
        JudgingBody judgingBody = judgingBodyRepository.findById(judgingBodyId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum órgão julgador com o ID fornecido."));

        if (judgingBody.isActive()) {
            throw new IllegalArgumentException("Este órgão julgador já está ativo.");
        }

        judgingBody.setActive(true);

        return toResponse(judgingBody);
    }

    private JudgingBodyResponse toResponse(JudgingBody judgingBody) {
        return new JudgingBodyResponse(
                judgingBody.getId(),
                judgingBody.getName(),
                judgingBody.isActive()
        );
    }
}
