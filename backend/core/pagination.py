from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class EstandarPageNumberPagination(PageNumberPagination):
    """
    TK170: Paginador global estándar para la API REST.
    Estandariza todas las respuestas de listas bajo el contrato:
    {
        'count': int,
        'next': str | None,
        'previous': str | None,
        'total_items': int,
        'total_pages': int,
        'current_page': int,
        'results': list
    }
    """
    page_size = 10
    page_size_query_param = 'limit'
    page_query_param = 'page'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'total_items': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })
